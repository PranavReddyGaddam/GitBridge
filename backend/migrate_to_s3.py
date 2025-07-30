#!/usr/bin/env python3
"""
Migration script to move local podcast storage to S3.
This script will migrate all existing podcast files, metadata, and cache entries to S3.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

from services.hybrid_storage import HybridStorageService
from services.storage import FileStorageService

def check_environment():
    """Check if required environment variables are set."""
    load_dotenv()
    
    required_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'S3_BUCKET_NAME'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables in your .env file or environment.")
        return False
    
    print("✅ Environment variables configured")
    return True

def check_s3_connection():
    """Test S3 connection and bucket access."""
    try:
        storage = HybridStorageService()
        if not storage.use_s3:
            print("❌ S3 is not configured properly")
            return False
        
        # Test bucket access
        stats = storage.get_storage_stats()
        print(f"✅ S3 connection successful")
        print(f"   Bucket: {stats.get('bucket_name', 'Unknown')}")
        print(f"   Storage type: {storage.get_storage_type()}")
        return True
        
    except Exception as e:
        print(f"❌ S3 connection failed: {e}")
        return False

def get_local_stats():
    """Get statistics about local storage."""
    local_storage = FileStorageService()
    stats = local_storage.get_storage_stats()
    
    print("📊 Local Storage Statistics:")
    print(f"   Cached podcasts: {stats['cached_podcasts']}")
    print(f"   Audio files: {stats['audio_files']}")
    print(f"   Total size: {stats['total_size_mb']} MB")
    print(f"   Storage path: {stats['storage_path']}")
    
    return stats

def migrate_data():
    """Migrate all local data to S3."""
    print("\n🚀 Starting migration to S3...")
    
    try:
        storage = HybridStorageService()
        
        if not storage.use_s3:
            print("❌ S3 is not configured. Cannot migrate.")
            return False
        
        # Get local stats before migration
        local_stats = get_local_stats()
        
        if local_stats['cached_podcasts'] == 0:
            print("ℹ️  No local podcasts to migrate.")
            return True
        
        # Perform migration
        storage.migrate_to_s3()
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        s3_stats = storage.get_storage_stats()
        
        print("📊 S3 Storage Statistics after migration:")
        print(f"   Cached podcasts: {s3_stats['cached_podcasts']}")
        print(f"   Audio files: {s3_stats['audio_files']}")
        print(f"   Total size: {s3_stats['total_size_mb']} MB")
        print(f"   Storage type: {s3_stats['storage_type']}")
        
        if s3_stats.get('cdn_domain'):
            print(f"   CDN domain: {s3_stats['cdn_domain']}")
        
        # Compare counts
        if s3_stats['cached_podcasts'] >= local_stats['cached_podcasts']:
            print("✅ Migration successful!")
            return True
        else:
            print("⚠️  Migration may be incomplete. Some files may not have been migrated.")
            return False
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

def setup_cdn():
    """Provide instructions for setting up CDN."""
    print("\n🌐 CDN Setup Instructions:")
    print("To use CloudFront CDN with your S3 bucket:")
    print("1. Create a CloudFront distribution")
    print("2. Set the origin to your S3 bucket")
    print("3. Configure the distribution settings")
    print("4. Set the CDN_DOMAIN environment variable")
    print("5. Update your application to use the CDN domain")

def main():
    """Main migration function."""
    print("🎙️  GitBridge Podcast Storage Migration to S3")
    print("=" * 50)
    
    # Check environment
    if not check_environment():
        return
    
    # Check S3 connection
    if not check_s3_connection():
        return
    
    # Show local stats
    get_local_stats()
    
    # Ask for confirmation
    response = input("\nDo you want to proceed with migration? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        return
    
    # Perform migration
    success = migrate_data()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("\nNext steps:")
        print("1. Test your application with S3 storage")
        print("2. Set up CDN for better performance (optional)")
        print("3. Remove local files after confirming everything works")
        
        # Ask about CDN setup
        cdn_response = input("\nWould you like CDN setup instructions? (y/N): ")
        if cdn_response.lower() == 'y':
            setup_cdn()
    else:
        print("\n❌ Migration failed. Please check the logs and try again.")

if __name__ == "__main__":
    main() 