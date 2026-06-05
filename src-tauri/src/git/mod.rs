pub mod types;
pub use types::*;

use git2::{Repository, build::CheckoutBuilder};
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

    pub fn list_snapshots(&self) -> Result<Vec<Snapshot>> {
        let mut revwalk = self.repo.revwalk()?;
        
        // Only push HEAD if it exists (repo is not empty)
        if self.repo.head().is_ok() {
            revwalk.push_head()?;
        }

        let mut snapshots = Vec::new();
        for id in revwalk {
            let id = id?;
            let commit = self.repo.find_commit(id)?;
            let timestamp = commit.time().seconds();
            let message = commit.message().unwrap_or("").to_string();
            
            snapshots.push(Snapshot {
                id: id.to_string(),
                hash: id.to_string(),
                name: message.clone(),
                message,
                timestamp,
            });
        }
        Ok(snapshots)
    }

    pub fn restore(&self, hash: &str) -> Result<()> {
        let oid = git2::Oid::from_str(hash)?;
        let commit = self.repo.find_commit(oid)?;
        
        self.repo.checkout_tree(
            commit.as_object(),
            Some(CheckoutBuilder::new().force())
        )?;
        
        self.repo.set_head_detached(oid)?;
        
        Ok(())
    }

    pub fn has_uncommitted_changes(&self) -> Result<bool> {
        let mut opts = git2::StatusOptions::new();
        opts.include_untracked(true);
        let statuses = self.repo.statuses(Some(&mut opts))?;
        Ok(!statuses.is_empty())
    }
}
