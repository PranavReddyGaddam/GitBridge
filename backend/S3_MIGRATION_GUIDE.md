# S3 Migration Guide for GitBridge Podcasts

This guide will help you migrate your local podcast storage to Amazon S3 with optional CDN support for better performance and scalability.

## Overview

The migration involves:
1. Setting up AWS S3 credentials
2. Creating an S3 bucket
3. Migrating existing local files to S3
4. Configuring CDN (optional)
5. Updating your application to use S3 storage

## Prerequisites

- AWS account with S3 access
- Python 3.8+ with required dependencies
- Existing local podcast files (if any)

## Step 1: AWS Setup

### 1.1 Create AWS IAM User
1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach the `AmazonS3FullAccess` policy (or create a custom policy with minimal permissions)
4. Save the Access Key ID and Secret Access Key

### 1.2 Create S3 Bucket
1. Go to AWS S3 Console
2. Create a new bucket with a unique name (e.g., `gitbridge-podcasts-yourname`)
3. Choose your preferred region
4. Configure bucket settings:
   - Block all public access (recommended)
   - Enable versioning (optional)
   - Set up lifecycle rules for cost optimization (optional)

### 1.3 Configure Environment Variables
Copy the `env.example` file to `.env` and update the AWS configuration:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

## Step 2: Run Migration

### 2.1 Test Configuration
First, test your S3 configuration:

```bash
cd backend
python migrate_to_s3.py
```

The script will:
- Check environment variables
- Test S3 connection
- Show local storage statistics
- Ask for confirmation before migration

### 2.2 Execute Migration
If the test is successful, the migration script will:
- Upload all local podcast files to S3
- Migrate cache entries and metadata
- Verify the migration was successful
- Provide statistics comparison

## Step 3: CDN Setup (Optional)

For better performance and global distribution, set up CloudFront CDN:

### 3.1 Create CloudFront Distribution
1. Go to AWS CloudFront Console
2. Create a new distribution
3. Set origin domain to your S3 bucket
4. Configure settings:
   - Default root object: (leave empty)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Cache policy: CachingOptimized

### 3.2 Update Environment
Add your CloudFront domain to `.env`:

```bash
CDN_DOMAIN=your-distribution-domain.cloudfront.net
```

## Step 4: Application Updates

The application has been updated to use hybrid storage that automatically switches between local and S3 storage based on configuration.

### 4.1 Storage Service Changes
- `FileStorageService`: Original local storage
- `S3StorageService`: New S3 storage with CDN support
- `HybridStorageService`: Automatically chooses between local and S3

### 4.2 Automatic Fallback
The hybrid storage service will:
- Use S3 if credentials are configured
- Fall back to local storage if S3 is unavailable
- Provide seamless migration path

## Step 5: Verification

### 5.1 Test New Podcast Generation
1. Generate a new podcast
2. Check that files are stored in S3
3. Verify CDN URLs are working (if configured)

### 5.2 Check Storage Statistics
Use the API endpoint to check storage statistics:

```bash
curl http://localhost:8000/api/podcast/storage-stats
```

## Step 6: Cleanup (Optional)

After confirming everything works:

### 6.1 Remove Local Files
```bash
# Backup first
cp -r backend/storage backend/storage_backup

# Remove local files
rm -rf backend/storage/podcasts/audio/*
rm -rf backend/storage/podcasts/scripts/*
rm -rf backend/storage/podcasts/metadata/*
rm -rf backend/storage/cache/*
```

### 6.2 Update Application Configuration
You can force local-only storage by setting:

```python
storage_service = HybridStorageService(use_s3=False)
```

## Troubleshooting

### Common Issues

1. **S3 Connection Failed**
   - Check AWS credentials
   - Verify bucket name and region
   - Ensure IAM permissions are correct

2. **Migration Incomplete**
   - Check network connectivity
   - Verify file permissions
   - Review error logs

3. **CDN Not Working**
   - Verify CloudFront distribution is deployed
   - Check origin settings
   - Test with direct S3 URLs first

### Debug Commands

```bash
# Test S3 connection
python -c "from services.s3_storage import S3StorageService; s = S3StorageService(); print(s.get_storage_stats())"

# Check local storage
python -c "from services.storage import FileStorageService; s = FileStorageService(); print(s.get_storage_stats())"

# Test hybrid storage
python -c "from services.hybrid_storage import HybridStorageService; s = HybridStorageService(); print(s.get_storage_type())"
```

## Cost Optimization

### S3 Lifecycle Rules
Set up lifecycle rules in your S3 bucket:
- Move infrequent access files to IA storage after 30 days
- Archive to Glacier after 90 days
- Delete old files after 1 year

### CloudFront Optimization
- Enable compression
- Set appropriate cache headers
- Use regional edge caches

## Security Considerations

1. **IAM Permissions**: Use least privilege principle
2. **Bucket Policy**: Restrict access to your application
3. **Encryption**: Enable server-side encryption
4. **Access Logs**: Enable S3 access logging for monitoring

## Performance Benefits

- **Global Distribution**: CDN provides worldwide access
- **Scalability**: S3 handles unlimited storage
- **Reliability**: 99.99% availability
- **Cost Efficiency**: Pay only for what you use

## Monitoring

Monitor your S3 usage through:
- AWS CloudWatch metrics
- S3 access logs
- CloudFront analytics
- Application storage statistics

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review AWS documentation
3. Test with minimal configuration
4. Verify each step individually 