pub mod types;

use git2::Repository;
use std::path::Path;
use crate::Result;

pub struct GitEngine {
    repo: Repository,
}

impl GitEngine {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let repo = Repository::open(path)?;
        Ok(Self { repo })
    }

    pub fn init<P: AsRef<Path>>(path: P) -> Result<Self> {
        let repo = Repository::init(path)?;
        Ok(Self { repo })
    }

    pub fn snapshot(&self, name: &str) -> Result<String> {
        let mut index = self.repo.index()?;
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;

        let tree_id = index.write_tree()?;
        let tree = self.repo.find_tree(tree_id)?;

        let sig = self.repo.signature()?;
        
        let parent_commit = match self.repo.head() {
            Ok(head) => Some(head.peel_to_commit()?),
            Err(_) => None,
        };

        let parents = if let Some(ref p) = parent_commit {
            vec![p]
        } else {
            vec![]
        };

        let commit_id = self.repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            name,
            &tree,
            &parents,
        )?;

        Ok(commit_id.to_string())
    }
}
