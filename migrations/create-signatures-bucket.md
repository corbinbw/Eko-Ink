# Create Signatures Storage Bucket

## Steps to create in Supabase Dashboard:

1. Go to **Storage** in your Supabase dashboard
2. Click **"Create a new bucket"**
3. Configure:
   - **Name**: `signatures`
   - **Public**: `false` (private bucket)
   - **File size limit**: `2097152` (2MB)
   - **Allowed MIME types**: `image/png, image/jpeg, image/svg+xml`

4. Click **"Create bucket"**

## Or run this SQL in SQL Editor:

```sql
-- Create signatures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  false,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
);

-- Storage policies for user signatures
CREATE POLICY "Users can upload their own signature"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own signature"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own signature"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own signature"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'signatures'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

## Storage Path Structure:
`signatures/{user_id}/signature.png`
