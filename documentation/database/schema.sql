CREATE TYPE role_enum AS ENUM ('Admin', 'Manager', 'Worker');


CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role_name role_enum NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    second_name VARCHAR(50),
    birthday_date DATE,
    email VARCHAR(100) UNIQUE NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE 
);

CREATE TABLE IF NOT EXISTS projects(
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    manager_id INTEGER NOT NULL,  -- project manager (or team lead)
    FOREIGN KEY (manager_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks(
    task_id SERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,
    task_description TEXT,
    deadline DATE,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed'
    project_id INTEGER NOT NULL,
    assigned_to INTEGER NOT NULL,  -- worker/employee assigned to this task
    normal_duration INTEGER DEFAULT 0,
    crash_duration INTEGER DEFAULT 0,
    crash_cost INTEGER DEFAULT 0,
    normal_cost INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events(
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    event_description TEXT,
    event_date DATE NOT NULL,
    requested_by INTEGER NOT NULL,  
    approved_by INTEGER,           
    FOREIGN KEY (requested_by) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL -- 
);

CREATE TABLE IF NOT EXISTS schedules(
    schedule_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id INTEGER,
    project_id INTEGER,
    schedule_date DATE NOT NULL,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reset_confirm_tokens (
    token VARCHAR(36) PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);