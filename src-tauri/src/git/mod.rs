pub mod types;

use git2::Repository;
use std::path::Path;
use crate::Result;

pub struct GitEngine {
    repo: Repository,
}

use types::Snapshot;

impl GitEngine {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let repo = Repository::open(path)?;
        Ok(Self { repo })
    }

    pub fn init<P: AsRef<Path>>(path: P) -> Result<Self> {
        let repo = Repository::init(path)?;
        Ok(Self { repo })
    }

    pub fn list_snapshots(&self) -> Result<Vec<Snapshot>> {
        let mut revwalk = self.repo.revwalk()?;
        
        // Push HEAD if it exists, ignore if repo is empty/new
        if let Ok(_) = self.repo.head() {
            revwalk.push_head()?;
        }

        let mut snapshots = Vec::new();
        for id in revwalk {
            let id = id?;
            let commit = self.repo.find_commit(id)?;
            snapshots.push(Snapshot {
                hash: id.to_string(),
                name: commit.message().unwrap_or("No message").to_string(),
                timestamp: commit.time().seconds(),
            });
        }
        Ok(snapshots)
    }

    pub fn restore_snapshot(&self, hash: &str) -> Result<()> {
        let id = git2::Oid::from_str(hash)?;
        let commit = self.repo.find_commit(id)?;
        let obj = commit.into_object();

        self.repo.checkout_tree(&obj, Some(git2::build::CheckoutBuilder::new().force()))?;
        self.repo.set_head_detached(id)?;
        
        Ok(())
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
