# Open Questions for Clear Comply Assessment Platform

As we finalize the SSP Builder integration, here are the key open questions and design decisions to align on:

## 1. Import of Legacy SSP Documents
*   **Question**: Should we support direct file uploads of legacy Excel/Word SSP documents and parse them using AI to pre-populate the 14 sections, or is manual intake inside the builder sufficient for now?

## 2. Additional Compliance Baselines
*   **Question**: Currently, the 14-section workbook matches the MNIT baseline (derived from NIST 800-53). Should we support switching the baseline/framework on the fly (e.g., to FedRAMP, CJIS, or SOC 2) and refactoring the builder sections accordingly?

## 3. Dynamic Weighting & Custom Risk Formula
*   **Question**: The Impact and Likelihood points formulas are hardcoded to the MNIT v6 Excel standard. Do we need an administrative UI allowing agency security officers to adjust points weights and risk bands, or is the standard formula locked?

## 4. Interactive Diagramming
*   **Question**: We built direct image uploads and previews for System Diagrams. Should we integrate an interactive canvas editor (like Excalidraw or Mermaid.js) to build Data Flow Diagrams directly in the browser?
