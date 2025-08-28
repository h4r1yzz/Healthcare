"""
LLM-based medical report generator for NeuroGrade.
Integrates with the consensus system to generate comprehensive cancer reports.
"""

import json
import base64
import os
import openai
from typing import Dict, List, Optional, Any
import logging

# Try to import weasyprint, handle gracefully if not available
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    HTML = None
    CSS = None

# Set up logging
logger = logging.getLogger(__name__)

class LLMReportGenerator:
    """
    LLM-based report generator that creates comprehensive medical reports
    from consensus data, radiologist comments, and segmentation images.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the LLM report generator.
        
        Args:
            api_key: OpenAI API key. If None, will try to get from environment.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass api_key parameter.")
        
        openai.api_key = self.api_key

    @staticmethod
    def load_scan_data(scan_data_path: str) -> Dict[str, Any]:
        """
        Load scan data including radiologist assessments and comments.
        
        Args:
            scan_data_path: Path to the scan data JSON file
            
        Returns:
            Dictionary containing scan data
        """
        try:
            with open(scan_data_path, "r") as f:
                data = json.load(f)
            return data
        except Exception as e:
            logger.error(f"Failed to load scan data from {scan_data_path}: {e}")
            return {}

    @staticmethod
    def load_consensus_verdict(consensus_path: str) -> Dict[str, Any]:
        """
        Load consensus verdict from JSON file.
        
        Args:
            consensus_path: Path to the consensus labels JSON file
            
        Returns:
            Dictionary containing consensus verdict
        """
        try:
            with open(consensus_path, "r") as f:
                data = json.load(f)
            # Get the first (and only) scan's verdict
            if not data:
                return {}
            _, verdict = next(iter(data.items()))
            return verdict
        except Exception as e:
            logger.error(f"Failed to load consensus verdict from {consensus_path}: {e}")
            return {}

    @staticmethod
    def extract_radiologist_comments(scan_data: Dict[str, Any]) -> List[str]:
        """
        Extract individual radiologist comments from scan data.

        Args:
            scan_data: Scan data dictionary containing radiologist assessments

        Returns:
            List of formatted comment strings with radiologist names
        """
        comments = []

        # Get the first (and only) scan's data
        if not scan_data:
            return comments

        _, scan_info = next(iter(scan_data.items()))

        for doctor, details in scan_info.items():
            # Check for different possible comment field names
            comment = details.get("Additional Comments") or details.get("comments") or details.get("Comments")
            if comment and comment.strip():
                # Format: "Dr. Name: Clinical observation..."
                comments.append(f"{doctor}: {comment}")

        return comments

    @staticmethod
    def encode_image_to_base64(image_path: str) -> str:
        """
        Encode image file to base64 string.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Base64 encoded string
        """
        try:
            with open(image_path, "rb") as img_file:
                return base64.b64encode(img_file.read()).decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to encode image {image_path}: {e}")
            raise

    def build_prompt(self, comments: List[str], verdict: Dict[str, Any]) -> str:
        """
        Build the prompt for the LLM to generate the medical report.

        Args:
            comments: List of individual radiologist comments
            verdict: Consensus verdict from multi-annotator algorithm

        Returns:
            Formatted prompt string
        """
        prompt = (
            "You are a medical AI assistant. Generate a comprehensive cancer report for the following brain scan.\n\n"
            "You have access to two distinct data sources:\n\n"
        )

        # Section 1: Algorithmic Consensus Findings
        prompt += "=== CONSENSUS FINDINGS (Multi-Radiologist Algorithm) ===\n"
        prompt += "The following represents the final consensus determined by a sophisticated multi-annotator algorithm "
        prompt += "that analyzed assessments from multiple radiologists using cleanlab technology:\n\n"

        for k, v in verdict.items():
            prompt += f"• {k}: {v}\n"
        prompt += "\n"

        # Section 2: Individual Radiologist Comments
        prompt += "=== INDIVIDUAL RADIOLOGIST OBSERVATIONS ===\n"
        if comments:
            prompt += "The following are individual clinical observations and insights from each radiologist:\n\n"
            for comment in comments:
                prompt += f"• {comment}\n"
            prompt += "\n"
        else:
            prompt += "No individual radiologist comments were provided.\n\n"

        prompt += """=== REPORT GENERATION INSTRUCTIONS ===

You are an experienced neuro-surgeon preparing an MRI-based brain cancer report for a patient.
Analyze the provided MRI scan image and integrate BOTH data sources above:

1. **Consensus Findings**: Use these as the primary diagnostic conclusions (most reliable)
2. **Individual Comments**: Incorporate these clinical insights and observations for context

Write the report in **pure HTML** using the professional medical report structure provided.
Do **NOT** wrap your answer in ```html or ``` code fences. Output only the raw HTML content.

**IMPORTANT STYLING REQUIREMENTS:**
- Use the CSS classes provided in the template for proper formatting
- Use `<div class="section-header">SECTION NAME</div>` for main sections
- Use `<div class="subsection-header">Subsection Name</div>` for subsections
- Use `<div class="consensus-block">` for consensus findings content
- Use `<div class="radiologist-block">` for individual radiologist observations
- Use `<div class="content-block">` for general content blocks
- Use `<div class="radiologist-name">Dr. Name</div>` for radiologist names
- Do not include <html>, <head>, or <body> tags — only the content

**REQUIRED SECTIONS (in this exact order):**

1. **EXECUTIVE SUMMARY**
   ```html
   <div class="section-header">Executive Summary</div>
   <div class="content-block">
   [Brief clinical overview based on consensus findings - 2-3 sentences]
   </div>
   ```

2. **CONSENSUS DIAGNOSIS**
   ```html
   <div class="section-header">Consensus Diagnosis</div>
   <div class="consensus-block">
   [Present the algorithmic consensus as the primary diagnostic conclusion]
   </div>
   ```

3. **INDIVIDUAL RADIOLOGIST OBSERVATIONS**
   ```html
   <div class="section-header">Individual Radiologist Observations</div>
   [For each radiologist comment, use:]
   <div class="radiologist-block">
   <div class="radiologist-name">Dr. [Name]</div>
   [Their specific observations and insights]
   </div>
   ```

4. **INTEGRATED CLINICAL ANALYSIS**
   ```html
   <div class="section-header">Integrated Clinical Analysis</div>
   <div class="content-block">
   [Synthesize consensus findings with individual observations]
   </div>
   ```

5. **RECOMMENDATIONS & NEXT STEPS**
   ```html
   <div class="section-header">Recommendations & Next Steps</div>
   <div class="content-block">
   [Evidence-based clinical recommendations]
   </div>
   ```

**KEY REQUIREMENTS:**
- Use medical terminology appropriate for healthcare professionals
- Clearly distinguish between consensus findings (most reliable) and individual observations
- Present information in a scannable format for busy clinicians
- Include specific clinical recommendations based on findings
- Maintain professional, clinical tone throughout
"""
        return prompt

    def generate_report(
        self,
        scan_id: str,
        case_dir: str,
        scan_data_path: Optional[str] = None,
        consensus_path: Optional[str] = None,
        visualization_path: Optional[str] = None,
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate a comprehensive medical report.
        
        Args:
            scan_id: Scan identifier
            case_dir: Case directory path
            scan_data_path: Path to scan data JSON (optional, will use default location)
            consensus_path: Path to consensus JSON (optional, will use default location)
            visualization_path: Path to visualization image (optional, will use default location)
            output_path: Output HTML path (optional, will use default location)
            
        Returns:
            Path to the generated PDF report
        """
        # Set default paths if not provided
        if scan_data_path is None:
            scan_data_path = os.path.join(case_dir, "scan_data.json")
        if consensus_path is None:
            consensus_path = os.path.join(case_dir, "consensus_labels.json")
        if visualization_path is None:
            visualization_path = os.path.join(case_dir, f"{scan_id}_seg_visualization.png")
        if output_path is None:
            output_path = os.path.join(case_dir, "medical_report.pdf")

        # Load data
        scan_data = self.load_scan_data(scan_data_path)
        verdict = self.load_consensus_verdict(consensus_path)
        comments = self.extract_radiologist_comments(scan_data)

        # Check if visualization image exists
        if not os.path.exists(visualization_path):
            logger.warning(f"Visualization image not found at {visualization_path}")
            # Try alternative naming patterns
            alt_paths = [
                os.path.join(case_dir, f"{scan_id}_visualization.png"),
                os.path.join(case_dir, "visualization.png"),
                os.path.join(case_dir, "segmentation.png")
            ]
            for alt_path in alt_paths:
                if os.path.exists(alt_path):
                    visualization_path = alt_path
                    break
            else:
                raise FileNotFoundError(f"No visualization image found for case {scan_id}")

        # Encode image
        image_b64 = self.encode_image_to_base64(visualization_path)
        
        # Build prompt
        prompt = self.build_prompt(comments, verdict)

        # Extract consensus values for the critical findings section
        consensus_location = verdict.get("Tumor Location", "Not specified")
        consensus_type = verdict.get("Tumor Type", "Not specified")
        consensus_grade = verdict.get("Tumor Grade", "Not specified")
        consensus_size = verdict.get("Size", "Not specified")
        consensus_confidence = verdict.get("Confidence", "Not specified")

        # Prepare messages for OpenAI API
        messages = [
            {
                "role": "system",
                "content": "You are a medical AI assistant specialized in radiology and oncology."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
                ]
            }
        ]

        try:
            # Generate report using OpenAI API
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=2048
            )

            html_content = response.choices[0].message.content

            # Create full HTML document with professional medical report styling
            full_html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Medical Report - {scan_id}</title>
    <meta charset="utf-8">
    <style>
        @page {{
            size: A4;
            margin: 1in;
            @top-center {{
                content: "CONFIDENTIAL MEDICAL REPORT";
                font-size: 8pt;
                color: #666;
                font-family: 'Times New Roman', serif;
            }}
            @bottom-center {{
                content: "Page " counter(page) " of " counter(pages);
                font-size: 8pt;
                color: #666;
                font-family: 'Times New Roman', serif;
            }}
        }}

        /* Base Typography */
        body {{
            font-family: 'Times New Roman', serif;
            line-height: 1.4;
            color: #000;
            font-size: 11pt;
            margin: 0;
            padding: 0;
        }}

        /* Medical Report Header */
        .medical-header {{
            border: 2px solid #1a365d;
            padding: 15px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            page-break-inside: avoid;
        }}

        .institution-info {{
            text-align: center;
            border-bottom: 1px solid #1a365d;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }}

        .institution-name {{
            font-size: 16pt;
            font-weight: bold;
            color: #1a365d;
            margin: 0;
            letter-spacing: 0.5px;
        }}

        .department {{
            font-size: 12pt;
            color: #2d3748;
            margin: 2px 0;
            font-style: italic;
        }}

        .report-title {{
            font-size: 14pt;
            font-weight: bold;
            color: #1a365d;
            text-align: center;
            margin: 10px 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}

        /* Patient & Case Information */
        .case-info {{
            display: table;
            width: 100%;
            margin-top: 10px;
        }}

        .case-info-row {{
            display: table-row;
        }}

        .case-info-cell {{
            display: table-cell;
            padding: 3px 10px;
            border-bottom: 1px dotted #cbd5e0;
            vertical-align: top;
        }}

        .case-info-label {{
            font-weight: bold;
            color: #2d3748;
            width: 25%;
        }}

        .case-info-value {{
            color: #1a202c;
            width: 75%;
        }}

        /* Critical Information Box */
        .critical-findings {{
            background: #fef5e7;
            border: 2px solid #ed8936;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            page-break-inside: avoid;
        }}

        .critical-title {{
            font-size: 13pt;
            font-weight: bold;
            color: #c05621;
            margin: 0 0 10px 0;
            text-align: center;
            text-transform: uppercase;
        }}

        .findings-grid {{
            display: table;
            width: 100%;
            border-collapse: collapse;
        }}

        .findings-row {{
            display: table-row;
        }}

        .findings-cell {{
            display: table-cell;
            padding: 8px 12px;
            border: 1px solid #ed8936;
            background: #fffbf0;
            vertical-align: top;
        }}

        .findings-label {{
            font-weight: bold;
            color: #744210;
            width: 30%;
        }}

        .findings-value {{
            color: #1a202c;
            font-weight: bold;
            width: 70%;
        }}

        /* Section Headers */
        .section-header {{
            background: #1a365d;
            color: white;
            padding: 8px 15px;
            margin: 25px 0 15px 0;
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            page-break-after: avoid;
        }}

        .subsection-header {{
            color: #1a365d;
            font-size: 11pt;
            font-weight: bold;
            margin: 15px 0 8px 0;
            padding-bottom: 3px;
            border-bottom: 1px solid #cbd5e0;
            page-break-after: avoid;
        }}

        /* Content Styling */
        .content-block {{
            margin-bottom: 15px;
            padding: 10px;
            background: #f7fafc;
            border-left: 4px solid #4299e1;
        }}

        .consensus-block {{
            background: #e6fffa;
            border-left: 4px solid #38b2ac;
            padding: 12px;
            margin: 10px 0;
        }}

        .radiologist-block {{
            background: #faf5ff;
            border-left: 4px solid #9f7aea;
            padding: 10px;
            margin: 8px 0;
        }}

        .radiologist-name {{
            font-weight: bold;
            color: #553c9a;
            margin-bottom: 5px;
        }}

        /* Image Styling */
        .image-container {{
            text-align: center;
            margin: 20px 0;
            page-break-inside: avoid;
        }}

        .scan-image {{
            max-width: 350px;
            width: 100%;
            border: 2px solid #1a365d;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }}

        .image-caption {{
            font-size: 10pt;
            color: #4a5568;
            font-style: italic;
            margin-top: 8px;
            text-align: center;
        }}

        /* Lists and Text */
        ul {{
            margin: 10px 0;
            padding-left: 20px;
        }}

        li {{
            margin-bottom: 4px;
            line-height: 1.3;
        }}

        p {{
            margin: 8px 0;
            text-align: justify;
            line-height: 1.4;
        }}

        strong {{
            color: #1a202c;
            font-weight: bold;
        }}

        /* Footer */
        .report-footer {{
            margin-top: 30px;
            padding: 15px;
            border-top: 2px solid #1a365d;
            background: #f7fafc;
            font-size: 9pt;
            color: #4a5568;
            page-break-inside: avoid;
        }}

        .footer-row {{
            margin: 3px 0;
        }}

        .disclaimer {{
            font-style: italic;
            text-align: center;
            margin-top: 10px;
            color: #718096;
        }}

        /* Utility Classes */
        .text-center {{ text-align: center; }}
        .text-bold {{ font-weight: bold; }}
        .text-italic {{ font-style: italic; }}
        .page-break {{ page-break-before: always; }}
        .no-break {{ page-break-inside: avoid; }}

        /* Print Optimizations */
        @media print {{
            body {{ -webkit-print-color-adjust: exact; }}
            .medical-header {{ background: #f8fafc !important; }}
        }}
    </style>
</head>
<body>
    <!-- Medical Report Header -->
    <div class="medical-header">
        <div class="institution-info">
            <div class="institution-name">NeuroGrade Medical Center</div>
            <div class="department">Department of Radiology & Neuroimaging</div>
        </div>
        <div class="report-title">Brain Tumor Analysis Report</div>

        <div class="case-info">
            <div class="case-info-row">
                <div class="case-info-cell case-info-label">Case ID:</div>
                <div class="case-info-cell case-info-value">{scan_id}</div>
                <div class="case-info-cell case-info-label">Report Date:</div>
                <div class="case-info-cell case-info-value">{__import__('datetime').datetime.now().strftime('%B %d, %Y')}</div>
            </div>
            <div class="case-info-row">
                <div class="case-info-cell case-info-label">Study Type:</div>
                <div class="case-info-cell case-info-value">MRI Brain with AI Segmentation</div>
                <div class="case-info-cell case-info-label">Generated:</div>
                <div class="case-info-cell case-info-value">{__import__('datetime').datetime.now().strftime('%H:%M %Z')}</div>
            </div>
            <div class="case-info-row">
                <div class="case-info-cell case-info-label">Analysis Method:</div>
                <div class="case-info-cell case-info-value" style="font-weight: bold;">Multi-Radiologist Consensus + AI</div>
                <div class="case-info-cell case-info-label">Priority:</div>
                <div class="case-info-cell case-info-value" style="color: #c53030; font-weight: bold;">URGENT REVIEW</div>
            </div>
        </div>
    </div>

    <!-- MRI Visualization -->
    <div class="image-container">
        <img src="data:image/png;base64,{image_b64}" alt="MRI Brain Segmentation" class="scan-image">
        <div class="image-caption">
            <strong>Figure 1:</strong> MRI FLAIR sequence with AI-generated tumor segmentation overlay (red region)
        </div>
    </div>

    <!-- Critical Findings Summary -->
    <div class="critical-findings">
        <div class="critical-title">⚠ Critical Findings Summary</div>
        <div class="findings-grid">
            <div class="findings-row">
                <div class="findings-cell findings-label">Tumor Location:</div>
                <div class="findings-cell findings-value">{consensus_location}</div>
            </div>
            <div class="findings-row">
                <div class="findings-cell findings-label">Tumor Type:</div>
                <div class="findings-cell findings-value">{consensus_type}</div>
            </div>
            <div class="findings-row">
                <div class="findings-cell findings-label">WHO Grade:</div>
                <div class="findings-cell findings-value">{consensus_grade}</div>
            </div>
            <div class="findings-row">
                <div class="findings-cell findings-label">Estimated Size:</div>
                <div class="findings-cell findings-value">{consensus_size}</div>
            </div>
            <div class="findings-row">
                <div class="findings-cell findings-label">Confidence Level:</div>
                <div class="findings-cell findings-value">{consensus_confidence}</div>
            </div>
        </div>
    </div>

    <!-- Main Report Content -->
    {html_content}

    <!-- Report Footer -->
    <div class="report-footer">
        <div class="footer-row"><strong>NeuroGrade Medical Report Generation System</strong></div>
        <div class="footer-row">Multi-Radiologist Consensus Analysis with AI-Assisted Interpretation</div>
        <div class="footer-row">Report ID: {scan_id} | Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        <div class="disclaimer">
            This report is generated for medical professional use only. Clinical decisions should be made in consultation with qualified healthcare providers.
            This AI-assisted analysis is intended to support, not replace, professional medical judgment.
        </div>
    </div>
</body>
</html>"""

            # Generate PDF from HTML
            if WEASYPRINT_AVAILABLE:
                try:
                    # Create HTML object and generate PDF
                    html_doc = HTML(string=full_html)
                    html_doc.write_pdf(output_path)

                    logger.info(f"PDF medical report generated successfully: {output_path}")
                    return output_path

                except Exception as e:
                    logger.error(f"Failed to generate PDF with weasyprint: {e}")
                    # Fallback to HTML
                    html_output_path = output_path.replace('.pdf', '.html')
                    with open(html_output_path, "w", encoding="utf-8") as f:
                        f.write(full_html)
                    logger.info(f"Fallback: HTML report saved as {html_output_path}")
                    return html_output_path
            else:
                # Weasyprint not available, save as HTML
                logger.warning("weasyprint not available, generating HTML report instead of PDF")
                html_output_path = output_path.replace('.pdf', '.html')
                with open(html_output_path, "w", encoding="utf-8") as f:
                    f.write(full_html)
                logger.info(f"HTML report saved as {html_output_path}")
                return html_output_path

        except Exception as e:
            logger.error(f"Failed to generate report: {e}")
            raise


def generate_report_for_case(scan_id: str, case_dir: str, api_key: Optional[str] = None) -> str:
    """
    Convenience function to generate a report for a specific case.
    
    Args:
        scan_id: Scan identifier
        case_dir: Case directory path
        api_key: OpenAI API key (optional)
        
    Returns:
        Path to the generated PDF report
    """
    generator = LLMReportGenerator(api_key=api_key)
    return generator.generate_report(scan_id, case_dir)


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python llm_report_generator.py <scan_id> <case_dir> [api_key]")
        sys.exit(1)
    
    scan_id = sys.argv[1]
    case_dir = sys.argv[2]
    api_key = sys.argv[3] if len(sys.argv) > 3 else None
    
    try:
        report_path = generate_report_for_case(scan_id, case_dir, api_key)
        print(f"Report generated: {report_path}")
    except Exception as e:
        print(f"Error generating report: {e}")
        sys.exit(1)
