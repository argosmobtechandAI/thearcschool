-- Create grading_scales table
CREATE TABLE grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  min_percentage NUMERIC NOT NULL,
  max_percentage NUMERIC NOT NULL,
  color_hex TEXT NOT NULL
);

-- Insert the default grading scale logic
INSERT INTO grading_scales (grade, min_percentage, max_percentage, color_hex) VALUES
  ('A+', 90, 100, '#16a34a'),
  ('A', 80, 89.99, '#16a34a'),
  ('B', 70, 79.99, '#3b82f6'),
  ('C', 60, 69.99, '#eab308'),
  ('D', 50, 59.99, '#f97316'),
  ('F', 0, 49.99, '#ef4444');
