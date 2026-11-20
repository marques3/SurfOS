CREATE TABLE schools (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Lisbon',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
CREATE TABLE users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner') NOT NULL DEFAULT 'owner',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_user_email (email),
  FOREIGN KEY (school_id) REFERENCES schools(id)
) ENGINE=InnoDB;
CREATE TABLE sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ix_sessions_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE teachers (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(80) NOT NULL,
  role VARCHAR(60) NOT NULL DEFAULT 'Surf coach',
  color CHAR(7) NOT NULL DEFAULT '#dce7d6',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_teacher_school (school_id,id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
) ENGINE=InnoDB;
CREATE TABLE students (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL,
  level ENUM('beginner','intermediate') NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_student_email (school_id,email),
  UNIQUE KEY uq_student_school (school_id,id),
  FOREIGN KEY (school_id) REFERENCES schools(id)
) ENGINE=InnoDB;
CREATE TABLE lessons (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  teacher_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  beach VARCHAR(80) NOT NULL,
  level ENUM('beginner','intermediate','private') NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_lesson_school (school_id,id),
  INDEX ix_lesson_schedule (school_id,lesson_date,teacher_id,status),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (school_id,teacher_id) REFERENCES teachers(school_id,id),
  CONSTRAINT ck_lesson_capacity CHECK (capacity BETWEEN 1 AND 12),
  CONSTRAINT ck_lesson_duration CHECK (duration_minutes IN (60,90,120)),
  CONSTRAINT ck_private CHECK (level <> 'private' OR capacity = 1),
  CONSTRAINT ck_price CHECK (price_cents <= 99900)
) ENGINE=InnoDB;
CREATE TABLE bookings (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  lesson_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_booking_pair (lesson_id,student_id),
  INDEX ix_booking_student (school_id,student_id,status),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (school_id,lesson_id) REFERENCES lessons(school_id,id),
  FOREIGN KEY (school_id,student_id) REFERENCES students(school_id,id)
) ENGINE=InnoDB;
CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(60) NOT NULL,
  entity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ix_audit_school (school_id,created_at),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
