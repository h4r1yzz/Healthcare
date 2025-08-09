import numpy as np
import pandas as pd
import pickle
import os
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict
from sklearn.metrics import accuracy_score, classification_report
import warnings

from backend.multiannotator_predictor import MultiAnnotatorPredictor, create_example_data

class MultiFieldAnnotatorPredictor:
    """
    Enhanced wrapper to run MultiAnnotatorPredictor on multiple tumor-related fields
    with training loop support for incremental learning when new MRI scans or radiologists are added.
    """
    def __init__(
        self,
        model=None,
        num_crossval_folds: int = 5,
        verbose: bool = False,
        model_save_dir: str = "models",
        auto_retrain_threshold: float = 0.1
    ):
        """
        Initialize the MultiFieldAnnotatorPredictor with training loop capabilities.

        Args:
            model: Base model to use (defaults to LogisticRegression)
            num_crossval_folds: Number of CV folds for out-of-sample predictions
            verbose: Whether to print verbose output
            model_save_dir: Directory to save trained models
            auto_retrain_threshold: Threshold for automatic retraining when data changes significantly
        """
        self.base_model = model if model is not None else LogisticRegression(random_state=42, max_iter=1000)
        self.num_crossval_folds = num_crossval_folds
        self.verbose = verbose
        self.model_save_dir = model_save_dir
        self.auto_retrain_threshold = auto_retrain_threshold

        self.original_training_data = {}
        # Define tumor classification constants
        self.TUMOR_FIELDS = {
            "Tumor Location": ["Frontal", "Parietal", "Temporal", "Occipital", "Cerebellum", "Brainstem"],
            "Tumor Type": ["Glioma", "Meningioma", "Metastasis", "Pituitary Adenoma", "Other"], 
            "Tumor Grade": ["I", "II", "III", "IV", "Unknown"],
            "Size": ["<10cm³", "10-50cm³", ">50cm³"],
            "Confidence": ["0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"]
        }

        # Training state
        self.field_results = {}
        self.field_models = {}  # Store trained models per field
        self.field_data_history = {}  # Track data changes per field
        self.training_history = {}  # Track training metrics over time

        # Create model directory if it doesn't exist
        os.makedirs(model_save_dir, exist_ok=True)

    def _detect_data_changes(self, field: str, labels_df: pd.DataFrame, features: np.ndarray) -> Dict[str, Any]:
        """
        Detect changes in data that might require retraining.
        """
        changes = {
            'new_examples': 0,
            'new_annotators': 0,
            'data_size_change_ratio': 0.0,
            'requires_retraining': False
        }

        if field not in self.field_data_history:
            # First time seeing this field
            changes['new_examples'] = len(labels_df)
            changes['new_annotators'] = len(labels_df.columns)
            changes['requires_retraining'] = True
        else:
            prev_data = self.field_data_history[field]

            # Check for new examples
            changes['new_examples'] = len(labels_df) - prev_data['num_examples']

            # Check for new annotators
            prev_annotators = set(prev_data['annotator_columns'])
            current_annotators = set(labels_df.columns)
            changes['new_annotators'] = len(current_annotators - prev_annotators)

            # Calculate data size change ratio
            if prev_data['num_examples'] > 0:
                changes['data_size_change_ratio'] = changes['new_examples'] / prev_data['num_examples']

            # Determine if retraining is required
            changes['requires_retraining'] = (
                changes['new_annotators'] > 0 or  # New annotators always require retraining
                abs(changes['data_size_change_ratio']) >= self.auto_retrain_threshold
            )

        return changes

    def _update_data_history(self, field: str, labels_df: pd.DataFrame, features: np.ndarray):
        """Update the data history for a field."""
        self.field_data_history[field] = {
            'num_examples': len(labels_df),
            'num_features': features.shape[1],
            'annotator_columns': list(labels_df.columns),
            'last_updated': datetime.now()
        }

    def _save_field_model(self, field: str, predictor: MultiAnnotatorPredictor):
        """Save a trained model for a specific field."""
        model_path = os.path.join(self.model_save_dir, f"{field.replace(' ', '_').lower()}_model.pkl")

        model_data = {
            'predictor': predictor,
            'training_timestamp': datetime.now(),
            'data_info': self.field_data_history.get(field, {})
        }

        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)

        if self.verbose:
            print(f"Saved model for field '{field}' to {model_path}")

    def _load_field_model(self, field: str) -> Optional[MultiAnnotatorPredictor]:
        """Load a previously trained model for a specific field."""
        model_path = os.path.join(self.model_save_dir, f"{field.replace(' ', '_').lower()}_model.pkl")

        if not os.path.exists(model_path):
            return None

        try:
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)

            if self.verbose:
                print(f"Loaded existing model for field '{field}' from {model_path}")

            return model_data['predictor']
        except Exception as e:
            if self.verbose:
                print(f"Failed to load model for field '{field}': {e}")
            return None

    def train_field_model(
        self,
        field: str,
        labels_df: pd.DataFrame,
        features: np.ndarray,
        force_retrain: bool = False
    ) -> Tuple[MultiAnnotatorPredictor, Dict[str, Any]]:
        """
        Train or retrain a model for a specific field with change detection.
        
        Args:
            field: Field name
            labels_df: Annotator labels DataFrame
            features: Feature matrix
            force_retrain: Force retraining even if not needed
        
        Returns:
            Tuple of (trained_predictor, training_info)
        """
        # Always drop scan_id column if present
        labels_df = labels_df.drop(columns=["scan_id"], errors="ignore")
        if self.verbose:
            print(f"\n=== Training model for field: {field} ===")

        # Detect data changes
        changes = self._detect_data_changes(field, labels_df, features)

        if self.verbose:
            print(f"Data changes detected:")
            print(f"  - New examples: {changes['new_examples']}")
            print(f"  - New annotators: {changes['new_annotators']}")
            print(f"  - Data size change ratio: {changes['data_size_change_ratio']:.3f}")
            print(f"  - Requires retraining: {changes['requires_retraining']}")

        # Check if we need to retrain
        if not force_retrain and not changes['requires_retraining']:
            # Try to load existing model
            existing_predictor = self._load_field_model(field)
            if existing_predictor is not None:
                if self.verbose:
                    print("Using existing model (no significant changes detected)")
                return existing_predictor, {'reused_existing': True, 'changes': changes}

        # Train new model
        if self.verbose:
            print("Training new model...")

        # Dynamically adjust num_crossval_folds for small batches
        # Find the minimum class count in the current labels
        label_values = labels_df.values
        # Flatten and count occurrences
        unique, counts = np.unique(label_values, return_counts=True)
        min_class_count = counts.min() if len(counts) > 0 else 1
        cv_folds = max(2, min(self.num_crossval_folds, min_class_count))

        predictor = MultiAnnotatorPredictor(
            model=self.base_model,
            num_crossval_folds=cv_folds,
            verbose=self.verbose
        )

        # Train the model
        start_time = datetime.now()
        results = predictor.predict(
            multiannotator_labels=labels_df,
            features=features,
            return_detailed_results=True
        )
        training_time = (datetime.now() - start_time).total_seconds()

        # Store results and model
        self.field_results[field] = results
        self.field_models[field] = predictor

        # Update data history
        self._update_data_history(field, labels_df, features)

        # Save model
        self._save_field_model(field, predictor)

        # Record training metrics
        training_info = {
            'reused_existing': False,
            'changes': changes,
            'training_time_seconds': training_time,
            'num_examples': len(labels_df),
            'num_annotators': len(labels_df.columns),
            'avg_consensus_quality': results['consensus_quality_scores'].mean(),
            'timestamp': datetime.now()
        }

        # Update training history
        if field not in self.training_history:
            self.training_history[field] = []
        self.training_history[field].append(training_info)

        if self.verbose:
            print(f"Training completed in {training_time:.2f} seconds")
            print(f"Average consensus quality: {training_info['avg_consensus_quality']:.3f}")

        return predictor, training_info

    def predict_for_fields(
        self,
        multiannotator_labels_dict: Dict[str, pd.DataFrame],
        features_dict: Dict[str, np.ndarray],
        force_retrain: bool = False
    ) -> Dict[str, Dict[str, Any]]:
        """
        Runs consensus prediction for each tumor metadata field with intelligent retraining.
        
        Args:
            multiannotator_labels_dict: dict mapping field name -> annotator label DataFrame
            features_dict: dict mapping field name -> feature matrix for that field
            force_retrain: Force retraining of all models regardless of changes
        
        Returns:
            dict: field name -> results from MultiAnnotatorPredictor.predict()
        """
        training_summary = {}

        for field, labels_df in multiannotator_labels_dict.items():
            if field.lower() in ["tumor presence", "presence"]:
                if self.verbose:
                    print(f"Skipping field '{field}' (always positive).")
                continue

            # Train or load model for this field
            predictor, training_info = self.train_field_model(
                field=field,
                labels_df=labels_df,
                features=features_dict[field],
                force_retrain=force_retrain
            )

            training_summary[field] = training_info

        if self.verbose:
            self._print_training_summary(training_summary)

        return self.field_results

    def _print_training_summary(self, training_summary: Dict[str, Dict[str, Any]]):
        """Print a summary of training results."""
        print("\n" + "="*60)
        print("TRAINING SUMMARY")
        print("="*60)

        total_training_time = 0
        reused_count = 0
        retrained_count = 0

        for field, info in training_summary.items():
            status = "REUSED" if info['reused_existing'] else "RETRAINED"
            print(f"{field:30} | {status:10} | ", end="")

            if info['reused_existing']:
                reused_count += 1
                print("No significant changes")
            else:
                retrained_count += 1
                total_training_time += info['training_time_seconds']
                print(f"Time: {info['training_time_seconds']:.2f}s | "
                      f"Quality: {info['avg_consensus_quality']:.3f} | "
                      f"Examples: {info['num_examples']} | "
                      f"Annotators: {info['num_annotators']}")

        print("-" * 60)
        print(f"Total fields processed: {len(training_summary)}")
        print(f"Models reused: {reused_count}")
        print(f"Models retrained: {retrained_count}")
        if retrained_count > 0:
            print(f"Total training time: {total_training_time:.2f}s")
            print(f"Average training time: {total_training_time/retrained_count:.2f}s")
        print("="*60)

    def add_new_scan(
        self,
        scan_data: Dict[str, Dict[str, Dict[str, str]]]
    ) -> Dict[str, Any]:
        """
        Add one or more new MRI scans from JSON format and retrain all field models.
        Combines new data with existing training data.
        """
        def bin_confidence_value(conf_str: str) -> str:
            """
            Map a confidence string like '65%' to the closest bin in self.TUMOR_FIELDS['Confidence'].
            If already a valid bin, return as is. If not a valid percentage, return ''.
            """
            bins = [
                (0, 10, "0-10%"),
                (10, 20, "10-20%"),
                (20, 30, "20-30%"),
                (30, 40, "30-40%"),
                (40, 50, "40-50%"),
                (50, 60, "50-60%"),
                (60, 70, "60-70%"),
                (70, 80, "70-80%"),
                (80, 90, "80-90%"),
                (90, 101, "90-100%")
            ]
            conf_str = conf_str.strip()
            if conf_str in [b[2] for b in bins]:
                return conf_str
            if conf_str.endswith("%"):
                try:
                    val = float(conf_str[:-1])
                    for low, high, label in bins:
                        if low <= val < high:
                            return label
                except Exception:
                    return ""
            return ""

        if self.verbose:
            print(f"\nAdding new scan data for {len(scan_data)} scans")

        scan_ids = list(scan_data.keys())
        consensus_results = {}
        
        # Process each field
        for field in self.TUMOR_FIELDS.keys():
            if self.verbose:
                print(f"\nProcessing field: {field}")
            
            # Convert new JSON data to DataFrame format for this field
            new_field_labels = []
            annotator_names = set()
            
            # Collect all annotator names from new data
            for scan_id, doctors in scan_data.items():
                annotator_names.update(doctors.keys())
            
            annotator_names = sorted(list(annotator_names))
            
            # Build labels matrix for new scans
            for scan_id in scan_ids:
                scan_labels = []
                for annotator in annotator_names:
                    if annotator in scan_data[scan_id]:
                        label_str = scan_data[scan_id][annotator].get(field, "")
                        # Special handling for Confidence field: bin the value if needed
                        if field == "Confidence":
                            label_str = bin_confidence_value(label_str)
                        if label_str in self.TUMOR_FIELDS[field]:
                            label_idx = self.TUMOR_FIELDS[field].index(label_str)
                        else:
                            label_idx = np.nan
                        scan_labels.append(label_idx)
                    else:
                        scan_labels.append(np.nan)
                new_field_labels.append(scan_labels)
            
            # Create DataFrame for new data
            new_labels_df = pd.DataFrame(new_field_labels, columns=annotator_names)
            
            # Generate features for new scans to match original feature dimensions
            if field in self.original_training_data:
                num_features = self.original_training_data[field]['features'].shape[1]
            else:
                num_features = 2
            
            new_features = np.random.randn(len(scan_ids), num_features)
            
            # Always combine with original training data if available
            if field in self.original_training_data:
                original_labels = self.original_training_data[field]['labels']
                original_features = self.original_training_data[field]['features']
                
                if self.verbose:
                    print(f"Combining {len(original_labels)} original scans with {len(new_labels_df)} new scans")
                
                # Align annotator columns - get union of all annotators
                all_annotators = sorted(list(set(original_labels.columns) | set(new_labels_df.columns)))
                
                # Reindex both DataFrames to have same columns
                original_aligned = original_labels.reindex(columns=all_annotators, fill_value=np.nan)
                new_aligned = new_labels_df.reindex(columns=all_annotators, fill_value=np.nan)
                
                # Combine labels and features
                combined_labels = pd.concat([original_aligned, new_aligned], ignore_index=True)
                combined_features = np.vstack([original_features, new_features])
                
                if self.verbose:
                    print(f"Combined dataset: {len(combined_labels)} total scans, {len(combined_labels.columns)} annotators")
                
                # Train with combined data
                predictor, training_info = self.train_field_model(
                    field=field,
                    labels_df=combined_labels,
                    features=combined_features,
                    force_retrain=True
                )
                
            else:
                if self.verbose:
                    print(f"No original data found for {field}, using only new data")
                
                # Handle single sample case by creating duplicates
                if len(new_labels_df) == 1:
                    if self.verbose:
                        print(f"Single scan detected - creating duplicates for cross-validation")
                    
                    # Create multiple duplicates with different classes
                    original_row = new_labels_df.iloc[0].copy()
                    duplicated_rows = [original_row]
                    
                    # Get non-NaN columns to modify
                    non_nan_cols = new_labels_df.columns[~new_labels_df.iloc[0].isna()]
                    num_classes = len(self.TUMOR_FIELDS[field])
                    
                    if len(non_nan_cols) > 0:
                        # Create 3 more duplicates with different classes
                        for i in range(3):
                            duplicate_row = original_row.copy()
                            current_class = int(original_row[non_nan_cols[0]])
                            new_class = (current_class + i + 1) % num_classes
                            duplicate_row[non_nan_cols[0]] = new_class
                            duplicated_rows.append(duplicate_row)
                    else:
                        # If all NaN, just duplicate as-is
                        for i in range(3):
                            duplicated_rows.append(original_row.copy())
                    
                    # Combine all duplicates
                    duplicated_labels = pd.DataFrame(duplicated_rows)
                    duplicated_features = np.tile(new_features, (4, 1))
                    
                    # Train with duplicated data
                    predictor, training_info = self.train_field_model(
                        field=field,
                        labels_df=duplicated_labels,
                        features=duplicated_features,
                        force_retrain=True
                    )
                    
                    # Keep only the first result (remove duplicates)
                    if field in self.field_results:
                        for key in ['consensus_labels', 'consensus_quality_scores']:
                            if key in self.field_results[field]:
                                self.field_results[field][key] = self.field_results[field][key][:1]
                        
                        if 'label_quality' in self.field_results[field]:
                            self.field_results[field]['label_quality'] = self.field_results[field]['label_quality'].iloc[:1]
                else:
                    # Normal case with multiple samples
                    predictor, training_info = self.train_field_model(
                        field=field,
                        labels_df=new_labels_df,
                        features=new_features,
                        force_retrain=True
                    )
        
        # Generate consensus labels for NEW scans only
        num_new_scans = len(scan_ids)
        for i, scan_id in enumerate(scan_ids):
            scan_consensus = {}
            for field in self.TUMOR_FIELDS.keys():
                if field in self.field_results and len(self.field_results[field]["consensus_labels"]) > 0:
                    if field in self.original_training_data:
                        # New scan results are at the end (after original data)
                        original_count = len(self.original_training_data[field]['labels'])
                        new_scan_idx = original_count + i
                    else:
                        # No original data, new scan is at index i
                        new_scan_idx = i
                    
                    if new_scan_idx < len(self.field_results[field]["consensus_labels"]):
                        consensus_idx = int(self.field_results[field]["consensus_labels"][new_scan_idx])
                        scan_consensus[field] = self.TUMOR_FIELDS[field][consensus_idx]
                    else:
                        scan_consensus[field] = None
                else:
                    scan_consensus[field] = None
            
            consensus_results[scan_id] = scan_consensus
            # Use the correct index for saving
            if field in self.original_training_data:
                save_idx = len(self.original_training_data[field]['labels']) + i
            else:
                save_idx = i
            self.save_consensus_labels_json(scan_id, scan_index=save_idx)

        if self.verbose:
            if any(field in self.original_training_data for field in self.TUMOR_FIELDS.keys()):
                print(f"\nProcessed {len(scan_ids)} new scans, combined with original training data")
            else:
                print(f"\nProcessed {len(scan_ids)} new scans (no original data available)")

        return {
            "scan_ids": scan_ids,
            "num_scans": len(scan_ids),
            "consensus_labels": consensus_results,
            "timestamp": datetime.now()
        }


    def save_consensus_labels_json(self, scan_id, scan_index=None, output_path=None):
        """
        Save the consensus labels for a specific scan to a JSON file.

        Args:
            scan_id: The scan identifier (string)
            scan_index: The index of the scan in the consensus_labels array
            output_path: Path to the JSON file. Defaults to backend/consensus_labels.json
        """
        import json
        import os

        # Default to saving inside the backend package directory
        if output_path is None:
            output_path = os.path.join(os.path.dirname(__file__), "consensus_labels.json")

        # Load existing data if file exists
        if os.path.exists(output_path):
            with open(output_path, "r") as f:
                consensus_data = json.load(f)
        else:
            consensus_data = {}

        # Build the entry for this scan_id
        scan_entry = {}
        for field, res in self.field_results.items():
            if scan_index is not None and len(res["consensus_labels"]) > scan_index:
                label_idx = int(res["consensus_labels"][scan_index])
                # Convert index to actual string value
                if field in self.TUMOR_FIELDS and label_idx < len(self.TUMOR_FIELDS[field]):
                    scan_entry[field] = self.TUMOR_FIELDS[field][label_idx]
                else:
                    scan_entry[field] = label_idx
            elif scan_index is None and len(res["consensus_labels"]) > 0:
                # Fallback to last label if no index provided
                label_idx = int(res["consensus_labels"][-1])
                if field in self.TUMOR_FIELDS and label_idx < len(self.TUMOR_FIELDS[field]):
                    scan_entry[field] = self.TUMOR_FIELDS[field][label_idx]
                else:
                    scan_entry[field] = label_idx
            else:
                scan_entry[field] = None

        consensus_data[scan_id] = scan_entry

        # Save back to file
        with open(output_path, "w") as f:
            json.dump(consensus_data, f, indent=2)

        # if self.verbose:
        #     print(f"Consensus labels for scan_id {scan_id} (index {scan_index}) saved to {output_path}")
        
        
if __name__ == "__main__":
    # Example usage demonstrating the MVP training loop functionality
    print("=== Multi-Field Annotator Predictor ===\n")

    # Initialize predictor with training loop capabilities
    multi_field_predictor = MultiFieldAnnotatorPredictor(
        verbose=True,
        model_save_dir="tumor_models",
        auto_retrain_threshold=0.1
    )

    # Use actual tumor classification fields
    fields = list(multi_field_predictor.TUMOR_FIELDS.keys())

    print("1. Initial training with baseline data...")
    labels_dict = {}
    features_dict = {}
    for field in fields:
        num_classes = len(multi_field_predictor.TUMOR_FIELDS[field])
        data = create_example_data(num_examples=1000, num_annotators=100, num_classes=num_classes, num_bad_annotators=5, seed=42)
        labels_dict[field] = data['multiannotator_labels']
        features_dict[field] = data['features']

    # Initial training
    all_results = multi_field_predictor.predict_for_fields(labels_dict, features_dict)

    print("\n2. Simulating addition of new MRI scans...")
    # Simulate adding a batch of new MRI scans
    scan_data = {
    "scan001": {
        "doctor1": {
            "Tumor Location": "Temporal",
            "Tumor Type": "Glioma", 
            "Tumor Grade": "III",
            "Size": ">50cm³",
            "Confidence": "35%"
        },
        "doctor2": {
            "Tumor Location": "Temporal",
            "Tumor Type": "Metastasis",
            "Tumor Grade": "IV", 
            "Size": "10-50cm³",
            "Confidence": "53%"
        },
        "doctor3": {
            "Tumor Location": "Occipital",
            "Tumor Type": "Glioma",
            "Tumor Grade": "III",
            "Size": ">50cm³",
            "Confidence": "20%"
        }
    }
}

    update_info = multi_field_predictor.add_new_scan(
        scan_data=scan_data,
    )
    print(f"Added {update_info['num_scans']} new scans with scan_ids: {update_info['scan_ids']}")

    print("\n3. Final results for each field:")
    for field, res in multi_field_predictor.field_results.items():
        print(f"\n=== {field} ===")
        print(f"Consensus labels: {len(res['consensus_labels'])} examples")
        print(f"Average quality: {res['consensus_quality_scores'].mean():.3f}")
        print(f"Number of annotators: {len(res['annotator_stats'])}")

        # Show top 3 examples with lowest quality
        low_quality_idx = np.argsort(res['consensus_quality_scores'])[:3]
        print("Lowest quality examples:")
        for idx in low_quality_idx:
            print(f"  Example {idx}: Quality = {res['consensus_quality_scores'][idx]:.3f}, "
                  f"Label = {res['consensus_labels'][idx]}")

    print("\n=== Complete ===")


