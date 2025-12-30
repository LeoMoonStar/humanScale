-- Create creators table
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  bio TEXT,
  location VARCHAR(255),
  category VARCHAR(100),
  industry VARCHAR(100),
  company VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  cover_image_url TEXT,
  website TEXT,
  twitter VARCHAR(100),
  linkedin VARCHAR(100),
  github VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

CREATE INDEX idx_creators_user ON creators(user_id);
CREATE INDEX idx_creators_verified ON creators(verified);
CREATE INDEX idx_creators_category ON creators(category);
CREATE INDEX idx_creators_status ON creators(status);

-- Creator skills
CREATE TABLE IF NOT EXISTS creator_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  proficiency VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_creator_skills_creator ON creator_skills(creator_id);

-- Creator achievements
CREATE TABLE IF NOT EXISTS creator_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  awarded_by VARCHAR(255),
  awarded_at DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_creator_achievements_creator ON creator_achievements(creator_id);

-- Work experience
CREATE TABLE IF NOT EXISTS work_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_experiences_creator ON work_experiences(creator_id);

-- Education
CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  institution VARCHAR(255) NOT NULL,
  degree VARCHAR(255) NOT NULL,
  field_of_study VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_education_creator ON education(creator_id);

-- Following relationship
CREATE TABLE IF NOT EXISTS following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, creator_id)
);

CREATE INDEX idx_following_user ON following(user_id);
CREATE INDEX idx_following_creator ON following(creator_id);
