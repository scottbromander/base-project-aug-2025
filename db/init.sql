-- Create application role (login user)
CREATE ROLE appuser WITH LOGIN PASSWORD 'apppass';

-- Create application database owned by that role
CREATE DATABASE appdb OWNER appuser;