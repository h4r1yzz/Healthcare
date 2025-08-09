import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict
from typing import Dict, Any, Optional, Union
import warnings

from cleanlab.multiannotator import get_label_quality_multiannotator, get_majority_vote_label

class MultiAnnotatorPredictor:
    """
    A class for analyzing multi-annotator labeled data and generating improved consensus labels.
    
    This class implements the cleanlab multi-annotator workflow:
    1. Computes initial consensus labels via majority vote
    2. Trains a classifier on the consensus labels to get predicted probabilities
    3. Uses cleanlab's algorithms to generate improved consensus labels and quality scores
    
    Attributes:
        model: The classifier model used for generating predicted probabilities
        num_crossval_folds: Number of cross-validation folds for generating out-of-sample predictions
        verbose: Whether to print verbose output during processing
    """
    
    def __init__(
        self, 
        model=None, 
        num_crossval_folds: int = 5, 
        verbose: bool = False
    ):
        """
        Initialize the MultiAnnotatorPredictor.
        
        Args:
            model: Sklearn-compatible classifier. Defaults to LogisticRegression()
            num_crossval_folds: Number of cross-validation folds for out-of-sample predictions
            verbose: Whether to print verbose output during processing
        """
        self.model = model if model is not None else LogisticRegression()
        self.num_crossval_folds = num_crossval_folds
        self.verbose = verbose
        
        # Store results from the last prediction
        self._last_results = None
        self._last_majority_vote_labels = None
        self._last_pred_probs = None
    
    def predict(
        self, 
        multiannotator_labels: Union[pd.DataFrame, np.ndarray], 
        features: np.ndarray,
        return_detailed_results: bool = True
    ) -> Dict[str, Any]:
        """
        Generate improved consensus labels and quality scores for multi-annotator data.
        
        Args:
            multiannotator_labels: DataFrame or array where each column represents an annotator
                                 and each row represents an example. Missing annotations should
                                 be represented as np.nan or pd.NA.
            features: Feature matrix (n_examples, n_features) used to train the classifier
            return_detailed_results: Whether to return detailed results including individual
                                   annotator quality scores and detailed label quality
        
        Returns:
            Dictionary containing:
            - 'consensus_labels': Improved consensus labels for each example
            - 'consensus_quality_scores': Quality scores for each consensus label
            - 'label_quality': DataFrame with consensus labels, quality scores, agreement, etc.
            - 'annotator_stats': DataFrame with quality scores for each annotator (if return_detailed_results=True)
            - 'detailed_label_quality': DataFrame with quality scores for each individual annotation (if return_detailed_results=True)
            - 'majority_vote_labels': Initial majority vote consensus labels
            - 'pred_probs': Out-of-sample predicted probabilities from the trained model
        """
        
        # Validate inputs
        if isinstance(multiannotator_labels, np.ndarray):
            multiannotator_labels = pd.DataFrame(multiannotator_labels)
        
        if features.shape[0] != multiannotator_labels.shape[0]:
            raise ValueError(f"Number of examples in features ({features.shape[0]}) must match "
                           f"number of examples in multiannotator_labels ({multiannotator_labels.shape[0]})")
        
        if self.verbose:
            print(f"Processing {multiannotator_labels.shape[0]} examples with "
                  f"{multiannotator_labels.shape[1]} annotators")
        
        # Step 1: Get initial consensus labels via majority vote
        if self.verbose:
            print("Computing initial consensus labels via majority vote...")
        
        majority_vote_labels = get_majority_vote_label(multiannotator_labels)
        self._last_majority_vote_labels = majority_vote_labels
        
        # Step 2: Train classifier and get out-of-sample predicted probabilities
        if self.verbose:
            print(f"Training {self.model.__class__.__name__} with {self.num_crossval_folds}-fold cross-validation...")

        # Ensure cv does not exceed the minimum class count
        class_counts = pd.Series(majority_vote_labels).value_counts()
        min_class_count = class_counts.min()
        num_unique_classes = len(class_counts)

        # Handle case where all annotators agree (only one class)
        if num_unique_classes == 1:
            if self.verbose:
                print(f"Warning: All annotators agree - only one class present. Skipping cross-validation and using consensus directly.")
            
            # Create mock probabilities where the consensus class has probability 1.0
            unique_class = majority_vote_labels[0]
            n_samples = len(majority_vote_labels)
            
            # Find all possible classes to create proper probability matrix
            all_classes = set()
            for col in multiannotator_labels.columns:
                unique_vals = multiannotator_labels[col].dropna().unique()
                all_classes.update(unique_vals)
            
            max_class = int(max(all_classes)) if all_classes else unique_class
            expected_num_classes = max_class + 1
            
            # Create probability matrix with proper dimensions
            pred_probs = np.full((n_samples, expected_num_classes), 1e-10)  # Small probability for all classes
            pred_probs[:, unique_class] = 1.0 - (expected_num_classes - 1) * 1e-10  # High probability for consensus class
            
            # Normalize to ensure probabilities sum to 1
            pred_probs = pred_probs / pred_probs.sum(axis=1, keepdims=True)
            
        else:
            # More conservative CV fold calculation
            if min_class_count < 2:
                # For classes with only 1 sample, we can't do proper CV
                # Use LeaveOneOut or simple train/test split
                if self.verbose:
                    print(f"Warning: Some classes have only {min_class_count} samples. Using LeaveOneOut CV.")
                from sklearn.model_selection import LeaveOneOut
                cv_strategy = LeaveOneOut()
                cv_folds = min(len(majority_vote_labels), self.num_crossval_folds)
            else:
                cv_folds = min(self.num_crossval_folds, min_class_count)
                # Use stratified CV to ensure each fold has samples from each class
                from sklearn.model_selection import StratifiedKFold
                cv_strategy = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)

            if self.verbose and cv_folds != self.num_crossval_folds:
                print(f"Reducing cross-validation folds from {self.num_crossval_folds} to {cv_folds} due to class distribution.")
                print(f"Class distribution: {dict(class_counts)}")

            pred_probs = cross_val_predict(
                estimator=self.model,
                X=features,
                y=majority_vote_labels,
                cv=cv_strategy,
                method="predict_proba"
            )
        
        # Handle case where pred_probs doesn't have enough columns for all classes
        # (Skip this if we already handled single-class case above)
        if num_unique_classes > 1:
            # Find all unique classes in multiannotator_labels
            all_classes = set()
            for col in multiannotator_labels.columns:
                unique_vals = multiannotator_labels[col].dropna().unique()
                all_classes.update(unique_vals)
            
            max_class = int(max(all_classes)) if all_classes else 0
            expected_num_classes = max_class + 1
            
            if pred_probs.shape[1] < expected_num_classes:
                if self.verbose:
                    print(f"Expanding pred_probs from {pred_probs.shape[1]} to {expected_num_classes} columns")
                
                # Create expanded probability matrix
                expanded_pred_probs = np.zeros((pred_probs.shape[0], expected_num_classes))
                
                # Get the classes that the model was trained on
                trained_classes = np.unique(majority_vote_labels)
                
                # Fill in probabilities for classes the model knows about
                for i, cls in enumerate(trained_classes):
                    expanded_pred_probs[:, cls] = pred_probs[:, i]
                
                # For missing classes, assign small uniform probability
                missing_prob = 1e-10
                for cls in range(expected_num_classes):
                    if cls not in trained_classes:
                        expanded_pred_probs[:, cls] = missing_prob
                
                # Renormalize to ensure probabilities sum to 1
                row_sums = expanded_pred_probs.sum(axis=1, keepdims=True)
                expanded_pred_probs = expanded_pred_probs / row_sums
                
                pred_probs = expanded_pred_probs
        
        self._last_pred_probs = pred_probs
        
        # Step 3: Use cleanlab to get improved consensus labels and quality scores
        if self.verbose:
            print("Computing improved consensus labels and quality scores...")
        
        results = get_label_quality_multiannotator(
            multiannotator_labels, 
            pred_probs, 
            verbose=self.verbose
        )
        self._last_results = results
        
        # Prepare return dictionary
        output = {
            'consensus_labels': results['label_quality']['consensus_label'].values,
            'consensus_quality_scores': results['label_quality']['consensus_quality_score'].values,
            'label_quality': results['label_quality'],
            'majority_vote_labels': majority_vote_labels,
            'pred_probs': pred_probs
        }
        
        if return_detailed_results:
            output['annotator_stats'] = results['annotator_stats']
            output['detailed_label_quality'] = results['detailed_label_quality']
        
        if self.verbose:
            print("Analysis complete!")
            print(f"Generated consensus labels for {len(output['consensus_labels'])} examples")
            if return_detailed_results:
                print(f"Analyzed {len(output['annotator_stats'])} annotators")
        
        return output

    def get_summary_stats(self) -> Optional[Dict[str, Any]]:
        """
        Get summary statistics from the last prediction results.

        Returns:
            Dictionary with summary statistics or None if no previous results
        """
        if self._last_results is None:
            warnings.warn("No previous results available. Run predict() first.")
            return None

        label_quality = self._last_results['label_quality']
        annotator_stats = self._last_results['annotator_stats']

        return {
            'num_examples': len(label_quality),
            'num_annotators': len(annotator_stats),
            'avg_consensus_quality': label_quality['consensus_quality_score'].mean(),
            'min_consensus_quality': label_quality['consensus_quality_score'].min(),
            'max_consensus_quality': label_quality['consensus_quality_score'].max(),
            'avg_annotator_agreement': label_quality['annotator_agreement'].mean(),
            'avg_annotations_per_example': label_quality['num_annotations'].mean(),
            'avg_annotator_quality': annotator_stats['annotator_quality'].mean(),
            'min_annotator_quality': annotator_stats['annotator_quality'].min(),
            'max_annotator_quality': annotator_stats['annotator_quality'].max()
        }


def create_example_data(
    num_examples: int = 300,
    num_annotators: int = 50,
    num_classes: int = 3,
    annotation_rate: float = 1.0,
    num_bad_annotators: int = 5,
    seed: int = 111
) -> Dict[str, Any]:
    """
    Create example multi-annotator data for testing purposes.

    This function replicates the data generation logic from the cleanlab tutorial.

    Args:
        num_examples: Number of examples to generate
        num_annotators: Number of annotators
        num_classes: Number of classes
        annotation_rate: Fraction of examples each annotator labels
        num_bad_annotators: Number of low-quality annotators to include
        seed: Random seed for reproducibility

    Returns:
        Dictionary containing:
        - 'features': Feature matrix (n_examples, 2)
        - 'multiannotator_labels': DataFrame with annotator labels
        - 'true_labels': True labels (for evaluation purposes)
    """
    np.random.seed(seed)

    # Generate synthetic 2D data for any number of classes
    means = [np.random.uniform(0, 10, size=2) for _ in range(num_classes)]
    covs = []
    for _ in range(num_classes):
        A = np.random.uniform(0.5, 2.0, size=(2, 2))
        cov = np.dot(A, A.T)  # ensures positive-definite
        covs.append(cov)
    sizes = [num_examples // num_classes] * num_classes
    for i in range(num_examples % num_classes):
        sizes[i] += 1

    local_data = []
    labels = []

    for idx in range(num_classes):
        local_data.append(
            np.random.multivariate_normal(mean=means[idx], cov=covs[idx], size=sizes[idx])
        )
        labels.append(np.array([idx for _ in range(sizes[idx])]))

    features = np.vstack(local_data)
    true_labels = np.hstack(labels)

    # Shuffle features and true_labels together to randomize class order
    indices = np.arange(features.shape[0])
    np.random.shuffle(indices)
    features = features[indices]
    true_labels = true_labels[indices]

    # Generate noise matrices for good and bad annotators
    try:
        from cleanlab.benchmarking.noise_generation import generate_noise_matrix_from_trace, generate_noisy_labels
    except ImportError:
        raise ImportError("cleanlab.benchmarking is required for example data generation. "
                         "Install cleanlab with: pip install cleanlab")

    py = np.bincount(true_labels) / float(len(true_labels))

    noise_matrix_good = generate_noise_matrix_from_trace(
        num_classes, trace=0.8 * num_classes, py=py, valid_noise_matrix=True, seed=seed
    )

    noise_matrix_bad = generate_noise_matrix_from_trace(
        num_classes, trace=0.35 * num_classes, py=py, valid_noise_matrix=True, seed=seed
    )

    # Generate noisy labels for each annotator
    annotator_labels = np.zeros((features.shape[0], num_annotators), dtype=int)
    for j in range(num_annotators):
        if j < num_annotators - num_bad_annotators:
            annotator_labels[:, j] = generate_noisy_labels(true_labels, noise_matrix_good)
        else:
            annotator_labels[:, j] = generate_noisy_labels(true_labels, noise_matrix_bad)

    # Create DataFrame and mask out labels based on annotation_rate
    multiannotator_labels = pd.DataFrame(annotator_labels)
    multiannotator_labels = multiannotator_labels.apply(
        lambda x: x.mask(np.random.random(len(x)) < (1 - annotation_rate))
    ).astype("Int64")

    # Remove columns (annotators) that have no labels
    multiannotator_labels.dropna(axis=1, how="all", inplace=True)

    # Remove rows (examples) that have no labels
    row_has_labels = pd.notna(multiannotator_labels).any(axis=1)
    multiannotator_labels = multiannotator_labels[row_has_labels].reset_index(drop=True)
    features = features[row_has_labels]
    true_labels = true_labels[row_has_labels]

    # Set column names
    multiannotator_labels.columns = [f"A{str(i+1).zfill(4)}" for i in range(len(multiannotator_labels.columns))]

    return {
        'features': features,
        'multiannotator_labels': multiannotator_labels,
        'true_labels': true_labels
    }


if __name__ == "__main__":
    # Example usage
    print("Creating example multi-annotator data...")
    data = create_example_data(num_examples=100, num_annotators=20, seed=42)

    print(f"Generated {data['features'].shape[0]} examples with {data['multiannotator_labels'].shape[1]} annotators")
    print(f"Feature matrix shape: {data['features'].shape}")
    print(f"Multi-annotator labels shape: {data['multiannotator_labels'].shape}")

    # Initialize predictor
    predictor = MultiAnnotatorPredictor(verbose=True)

    # Generate improved consensus labels
    print("\nRunning multi-annotator analysis...")
    results = predictor.predict(
        multiannotator_labels=data['multiannotator_labels'],
        features=data['features']
    )

    print(f"\nResults summary:")
    print(f"- Generated consensus labels for {len(results['consensus_labels'])} examples")
    print(f"- Average consensus quality score: {results['consensus_quality_scores'].mean():.3f}")
    print(f"- Analyzed {len(results['annotator_stats'])} annotators")

    # Show summary statistics
    stats = predictor.get_summary_stats()
    if stats:
        print(f"\nSummary Statistics:")
        for key, value in stats.items():
            if isinstance(value, float):
                print(f"- {key}: {value:.3f}")
            else:
                print(f"- {key}: {value}")


