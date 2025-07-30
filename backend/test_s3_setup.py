#!/usr/bin/env python3
"""
Test script to verify S3 configuration and connectivity.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(str(Path(__file__).parent))

def test_environment():
    """Test environment variables."""
    print("🔧 Testing environment variables...")
    
    load_dotenv()
    
    required_vars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'S3_BUCKET_NAME'
    ]
    
    optional_vars = [
        'AWS_REGION',
        'CDN_DOMAIN'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    
    print("✅ Required environment variables found")
    
    print("📋 Environment configuration:")
    for var in required_vars + optional_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if 'KEY' in var or 'SECRET' in var:
                masked_value = value[:4] + '*' * (len(value) - 8) + value[-4:]
                print(f"   {var}: {masked_value}")
            else:
                print(f"   {var}: {value}")
        else:
            print(f"   {var}: (not set)")
    
    return True

def test_s3_connection():
    """Test S3 connection and bucket access."""
    print("\n🔗 Testing S3 connection...")
    
    try:
        from services.s3_storage import S3StorageService
        
        storage = S3StorageService()
        
        # Test basic connection
        stats = storage.get_storage_stats()
        print("✅ S3 connection successful")
        print(f"   Bucket: {stats.get('bucket_name', 'Unknown')}")
        print(f"   Storage type: {stats.get('storage_type', 'S3')}")
        
        # Test bucket access
        try:
            storage.s3_client.head_bucket(Bucket=storage.bucket_name)
            print("✅ Bucket access confirmed")
        except Exception as e:
            print(f"❌ Bucket access failed: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ S3 connection failed: {e}")
        return False

def test_hybrid_storage():
    """Test hybrid storage service."""
    print("\n🔄 Testing hybrid storage...")
    
    try:
        from services.hybrid_storage import HybridStorageService
        
        storage = HybridStorageService()
        
        print(f"✅ Hybrid storage initialized")
        print(f"   Storage type: {storage.get_storage_type()}")
        print(f"   S3 enabled: {storage.use_s3}")
        
        if storage.use_s3:
            stats = storage.get_storage_stats()
            print(f"   S3 stats: {stats}")
        
        return True
        
    except Exception as e:
        print(f"❌ Hybrid storage test failed: {e}")
        return False

def test_file_operations():
    """Test basic file operations."""
    print("\n📁 Testing file operations...")
    
    try:
        from services.s3_storage import S3StorageService
        
        storage = S3StorageService()
        
        # Test file existence check
        test_key = "test/connection-test.txt"
        exists = storage.file_exists(test_key)
        print(f"   Test file exists: {exists}")
        
        # Test URL generation
        url = storage.get_file_url(test_key, expires_in=60)
        if url:
            print(f"   Presigned URL generated: {url[:50]}...")
        else:
            print("   ❌ Failed to generate presigned URL")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ File operations test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 GitBridge S3 Setup Test")
    print("=" * 40)
    
    tests = [
        ("Environment Variables", test_environment),
        ("S3 Connection", test_s3_connection),
        ("Hybrid Storage", test_hybrid_storage),
        ("File Operations", test_file_operations),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n📊 Test Results:")
    print("=" * 40)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! S3 is ready to use.")
        print("\nNext steps:")
        print("1. Run the migration script: python migrate_to_s3.py")
        print("2. Test with a new podcast generation")
        print("3. Set up CDN if desired")
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        print("\nCommon issues:")
        print("1. Check AWS credentials")
        print("2. Verify bucket name and region")
        print("3. Ensure IAM permissions are correct")
        print("4. Check network connectivity")

if __name__ == "__main__":
    main() 