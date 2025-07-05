import os
import sys
from dotenv import load_dotenv
from services.github import GitHubService

# Load environment variables
load_dotenv()

def print_file_tree(repo_url: str):
    github_service = GitHubService()
    import asyncio
    async def fetch_and_print():
        repo_data = await github_service.get_repository_data(repo_url)
        print("\n--- FILE TREE ---")
        print(repo_data["file_tree"])
        print("\n--- RAW TREE DATA ---")
        # Optionally, print the raw tree if you want to debug
        # print(repo_data["raw_tree"])
        print("\n--- README ---")
        print(repo_data["readme_content"])
    asyncio.run(fetch_and_print())

if __name__ == "__main__":
    if len(sys.argv) < 2:
        repo_url = input("Enter the GitHub repo URL: ").strip()
        if not repo_url:
            print("No repo URL provided. Exiting.")
            sys.exit(1)
    else:
        repo_url = sys.argv[1]
    print_file_tree(repo_url) 