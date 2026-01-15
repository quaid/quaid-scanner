# **Product Requirements Document: oss-repo-check (Strategic Expansion)**

## **1\. Executive Summary**

Current State: The initial concept of oss-repo-check functions as a basic "linter" for repository file presence (e.g., "Does README.md exist?").  
Expanded Vision: oss-repo-check will evolve into a Strategic Repository Health Orchestrator. It will not just verify the existence of artifacts but evaluate their quality, security, legal compliance, and sociotechnical health. It serves as an automated auditor for Open Source Program Offices (OSPOs), engineering managers, and AI agents evaluating tool safety.

## **2\. Problem Statement**

Modern open source risk management extends beyond code quality. Organizations face:

* **Supply Chain Attacks:** Simple file checks miss critical vulnerabilities like unpinned dependencies or lack of branch protection.  
* **Legal Mines:** Incompatible licenses in the dependency tree (e.g., linking GPL libraries in MIT projects) create hidden legal liability.  
* **Zombie Projects:** Repositories may look valid but have no active maintainers ("Bus Factor" of 1), posing long-term maintenance risks.  
* **AI Opacity:** AI models and agents often lack standard "Model Cards" or "Agentic Rules," making them unsafe or unpredictable to use.

## **3\. Strategic Pillars & Feature Requirements**

### **Pillar A: Advanced Security & Supply Chain Integrity (OpenSSF Integration)**

*Goal: Move from "secure code" to "secure supply chain" by adopting the OpenSSF Scorecard standard.*

| Feature ID | Requirement | Success Metric | Source / Standard |
| :---- | :---- | :---- | :---- |
| **SEC-01** | **OpenSSF Scorecard Integration** | Integrate or reimplement the 18-point([https://scorecard.dev](https://scorecard.dev)) checks. | Provide a "Trust Score" (0-10) based on industry consensus. |
| **SEC-02** | **Branch Protection Audit** | Verify via API if the default branch requires PR reviews, status checks, and prevents force pushes. | Flag repositories with unprotected main branches as "Critical Risk." |
| **SEC-03** | **Dependency Pinning Scan** | Detect unpinned dependencies (e.g., npm install package@latest or mutable Docker tags) in build files. | 100% detection of mutable tags in Dockerfiles/Workflows. |
| **SEC-04** | **Binary Artifact Detection** | Scan source tree for checked-in binaries (.exe, .jar, .dll) which hide malware and bloat history. | Flag any binary \> 1MB committed to source. |
| **SEC-05** | **Token Permission Analysis** | Parse GitHub Actions workflows to ensure GITHUB\_TOKEN permissions are set to read-all or scoped strictly (Principle of Least Privilege). | Flag workflows with default read/write permissions. |

### **Pillar B: Strategic Governance & Legal Compliance**

*Goal: Ensure the project is legally safe to use and democratically managed.*

| Feature ID | Requirement | Success Metric | Source / Standard |
| :---- | :---- | :---- | :---- |
| **GOV-01** | **License Compatibility Scan** | Perform a deep dependency scan to identify license conflicts (e.g., Copyleft viral pollution in permissive projects). | Report "High Legal Risk" if incompatible licenses are detected. |
| **GOV-02** | **SPDX Content Validation** | Verify LICENSE file content matches([https://spdx.dev/](https://spdx.dev/)) (not just file existence). | \< 95% Levenshtein distance match to standard text. |
| **GOV-03** | **Governance Model Classification** | semantic analysis of GOVERNANCE.md to classify model: BDFL, Meritocracy, or Foundation-backed. | Identify specific keywords ("Steering Committee", "Voting", "Consensus"). |
| **GOV-04** | **Bus Factor Analysis** | Analyze commit history to calculate the([https://chaoss.community/](https://chaoss.community/)). | Warn if \>50% of commits in last 6 months are by 1 author. |
| **GOV-05** | **Asset Protection Check** | Check for presence of Trademark Guidelines and Export Control notices (ECCN) for commercial-grade OSS. | Presence of trademark usage policy in docs. |

### **Pillar C: Sociotechnical Community Health (CHAOSS Metrics)**

*Goal: Assess the human viability and psychological safety of the project.*

| Feature ID | Requirement | Success Metric | Source / Standard |
| :---- | :---- | :---- | :---- |
| **COM-01** | **Time-to-First-Response** | Calculate median time for a human response to new Issues/PRs over the last 90 days. | Categorize as Healthy (\<48h), Slow (\>1 week), or Dormant (\>1 month). |
| **COM-02** | **Contributor Funnel Analysis** | Segment contributors into "Casual", "Regular", and "Core" cohorts to measure retention. | Visualize contributor drop-off rates. |
| **COM-03** | **Zombie Project Detection** | Identify high volume of "Stale" bot closures vs. human resolutions (Change Request Closure Ratio). | Flag projects where \>80% of closures are automated/stale. |
| **COM-04** | **DEI Artifact Check** | Validate CODE\_OF\_CONDUCT.md contains enforcement contact info (not just template text). | Boolean check for email/URL in CoC file. |

### **Pillar D: AI-Native & Agentic Readiness**

*Goal: Ensure repositories containing AI models or agents are documented for safety and discoverability.*

| Feature ID | Requirement | Success Metric | Source / Standard |
| :---- | :---- | :---- | :---- |
| **AI-01** | **Model Card Validation** | For AI repos, check README.md for "Intended Use", "Limitations", and "Bias" sections (Hugging Face standard). | Flag missing "Nutrition Label" sections. |
| **AI-02** | **Dataset Provenance** | Check for "Datasheets for Datasets" links or definitions if .csv/.parquet files are prevalent. | Presence of data lineage documentation. |
| **AI-03** | **Agentic Rule Detection** | Check for presence of .cursor/rules (Cursor), CLAUDE.md (Anthropic), or agentic-rules to support AI coding assistants. | Boolean check for AI context files. |
| **AI-04** | **Metadata Quality** | Validate YAML front-matter in README.md for machine readability (license, language, tags). | Valid YAML block present. |

### **Pillar E: Technical Rigor & Automation**

*Goal: Verify the project uses "Policy as Code" to maintain quality.*

| Feature ID | Requirement | Success Metric | Source / Standard |
| :---- | :---- | :---- | :---- |
| **TECH-01** | **Linter Configuration** | Detect config files for standard linters (.eslintrc, .pylintrc, golangci.yml) or meta-linters (Super-Linter). | Boolean check for linter configs. |
| **TECH-02** | **Test Coverage Reporting** | Check for integration with Codecov, Coveralls, or presence of coverage badges. | Detection of coverage reporting artifacts. |
| **TECH-03** | **Semantic Versioning** | Analyze git tags to ensure adherence to([https://semver.org/](https://semver.org/)). | Tags follow vX.Y.Z format. |

## **4\. Implementation Strategy: The Orchestrator Pattern**

Rather than building custom logic for every check, oss-repo-check will act as an orchestrator that invokes or parses outputs from specialized tools:

1. **Security Layer:** Wraps the([https://github.com/ossf/scorecard](https://github.com/ossf/scorecard)).  
2. **License Layer:** Uses([https://www.fossology.org/](https://www.fossology.org/)) or([https://clearlydefined.io/](https://clearlydefined.io/)) API definitions.  
3. **Metrics Layer:** Queries GitHub GraphQL API to calculate([https://chaoss.community/](https://chaoss.community/)) metrics locally.  
4. **AI Layer:** Custom parsers for Model Cards and Agentic Rule formats.

## **5\. User Experience & Reporting**

### **The "Health Report" JSON Output**

The tool will output a standardized JSON payload designed for both human consumption (dashboard) and machine consumption (AI agents determining if a tool is safe to use).

JSON

{  
  "repo": "owner/project",  
  "overall\_score": 8.5,  
  "risk\_level": "LOW",  
  "pillars": {  
    "security": {  
      "score": 9.0,  
      "details": { "branch\_protection": true, "pinned\_dependencies": true }  
    },  
    "governance": {  
      "score": 7.5,  
      "model": "Meritocracy",  
      "bus\_factor": 3  
    },  
    "community": {  
      "responsiveness": "24h",  
      "health\_status": "Active"  
    },  
    "ai\_readiness": {  
      "model\_card": "Present",  
      "agent\_rules":  
    }  
  }  
}

## **6\. Success Metrics (KPIs) for this Tool**

* **False Positive Rate:** \< 5% on "High Risk" flags.  
* **Scan Time:** \< 30 seconds for average repositories (excluding deep dependency scans).  
* **Adoption:** Used by OSPOs to gatekeep inbound open source usage.