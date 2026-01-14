# Repository For Methods, Datasets and Algorithms Related to Process Mining with Unstrutured Data

An interactive visualization platform for exploring process mining methods that work with unstructured data sources. Built with React, D3.js, and the Nord color palette.


Live Version: 
[https://chimenkamp.github.io/Repository-For-Methods-Datasets-and-Algorithms-Related-to-Process-Mining-with-Unstructured-Data/](https://chimenkamp.github.io/Repository-For-Methods-Datasets-and-Algorithms-Related-to-Process-Mining-with-Unstructured-Data/) 

## ➕ Adding a New Method

To add a new method, edit `data/methods.json`:

```json
{
  "id": "your-method-id",
  "name": "Your Method Name",
  "pipeline_step": "preprocess",
  "short_description": "A brief description (10-500 characters)",
  "algorithm_summary": "Technical details of how the method works",
  "inputs": ["Input 1", "Input 2"],
  "outputs": ["Output 1"],
  "modalities": ["text", "image"],
  "tasks": ["cleaning", "abstraction"],
  "assumptions": ["Assumption 1"],
  "limitations": ["Limitation 1"],
  "references": {
    "paper_title": "Paper Title",
    "authors": ["Author 1", "Author 2"],
    "venue": "Conference/Journal",
    "year": 2024,
    "doi_or_url": "https://doi.org/..."
  },
  "artifacts": {
    "code_url": "https://github.com/...",
    "dataset_url": "https://...",
    "demo_url": "https://..."
  },
  "tags": ["tag1", "tag2"],
  "related_method_ids": ["other-method-id"],
  "maturity": "emerging",
  "automation_level": "semi-automated",
  "evidence_type": "algorithm",
  "created_at": "2024-01-15T00:00:00Z",
  "updated_at": "2024-01-15T00:00:00Z"
}
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

