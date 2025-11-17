-- Contact Form Submissions
-- Store inbound contact requests from the landing page

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Submission details
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,

  -- Tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'spam', 'archived')),
  read_at TIMESTAMPTZ,
  notes TEXT, -- Admin can add internal notes

  -- Source tracking
  referrer TEXT,
  user_agent TEXT,
  ip_address INET
);

-- Index for admin dashboard queries
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- RLS Policies
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (public endpoint)
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view submissions
CREATE POLICY "Admins can view all contact submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN users u ON u.account_id = a.id
      WHERE u.id = auth.uid()
      AND a.is_admin = true
    )
  );

-- Only admins can update submissions (mark as read, change status, add notes)
CREATE POLICY "Admins can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN users u ON u.account_id = a.id
      WHERE u.id = auth.uid()
      AND a.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN users u ON u.account_id = a.id
      WHERE u.id = auth.uid()
      AND a.is_admin = true
    )
  );

-- Add comment
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from the landing page for admin review';
