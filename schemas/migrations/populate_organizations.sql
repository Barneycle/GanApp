-- =====================================================
-- POPULATE ORGANIZATIONS TABLE
-- This script populates the organizations table with initial data
-- =====================================================

-- CAH
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Ambareta', 'CAH', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

-- CBM
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Junior Finance Executive (JFinEx)', 'CBM', 'Goa Campus', false),
('Philippines Association of Students in Office Administration (PASOA)', 'CBM', 'Goa Campus', false),
('Junior Philippine Institute of Accountants (JPIA)', 'CBM', 'Goa Campus', false),
('ParSU Economics Students Organization (PESO)', 'CBM', 'Goa Campus', false),
('Partido Young Entrepreneurs Society (PYES)', 'CBM', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

-- CEC
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Patriot Chronicles', 'CEC', 'Goa Campus', false),
('Mechanical Engineering Technology Student Society (METSS)', 'CEC', 'Goa Campus', false),
('ParSU Math X-ecutors', 'CEC', 'Goa Campus', false),
('Philippine Society of Sanitary Engineers-Bicol Student Chapter (PSSE-BSC)', 'CEC', 'Goa Campus', false),
('Philippines Institute of Civil Engineers-Partido State University Student Chapter (PICE-ParSU)', 'CEC', 'Goa Campus', false),
('Nextgen Information Technology Enthusiasts (NITE)', 'CEC', 'Goa Campus', false),
('Society of Programmers and Enthusiasts in Computer Science (SPECS)', 'CEC', 'Goa Campus', false),
('Competent Active Responsive Electrical Students (CARES)', 'CEC', 'Goa Campus', false),
('ParSU Isarog Sports (PISU)', 'CEC', 'Goa Campus', false),
('Society of Engineering Technology in Refrigeration and Air Conditioning', 'CEC', 'Goa Campus', false),
('Society of Automotive Engineering Technology (SAET)', 'CEC', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

-- CED
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Language Integrating New Generation of Unified Advocates (LINGUA)', 'CED', 'Goa Campus', false),
('Samahang Itinataguyod and Kamalayan sa Literatura at Balarila (SIKLAB)', 'CED', 'Goa Campus', false),
('Society for Aspiring General Educators (SAGE)', 'CED', 'Goa Campus', false),
('Values Education Reinforcers (VALERE)', 'CED', 'Goa Campus', false),
('Science for Promotion of Health, Environment, and Research Education (SPHERE)', 'CED', 'Goa Campus', false),
('Mathematics Reinforcement and Integration Executives (MATRIX)', 'CED', 'Goa Campus', false),
('Social Studies Integrated Bureau of Learners (SSIBOL)', 'CED', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

-- COS
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Geological Organization of Partido State University (Go-ParSU)', 'COS', 'Goa Campus', false),
('Symbiotic Biology Students Society (SYMBIOSS)', 'COS', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Sagñay Campus
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Ascend to Greater Ocean Seekers (AGOS)', NULL, 'Sagñay Campus', false),
('Leading in Aquatic Youth Advancements and Growth (LAYAG)', NULL, 'Sagñay Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Salogon Campus
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Junior Association of Community Development Professionals (JACDPro)', NULL, 'Salogon Campus', false)
ON CONFLICT (name) DO NOTHING;

-- San Jose Campus
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Performing Arts San Jose', NULL, 'San Jose Campus', false),
('San Jose Medics', NULL, 'San Jose Campus', false),
('Association of Hospitality Management Students (AHMS)', NULL, 'San Jose Campus', false),
('Tourism Enthusiasts Association (TEA)', NULL, 'San Jose Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Lagonoy Campus
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Criminal Justice Education Student Organization (CJESO)', NULL, 'Lagonoy Campus', false),
('ParSU Intern Student Organization (PISO)', NULL, 'Lagonoy Campus', false),
('Independent and Diversity Educated Journalists'' Association (IDEJA)', NULL, 'Lagonoy Campus', false),
('Philippine Association of Nutrition-Phi Sigma Upsilon Chapter (PAN-PSU)', NULL, 'Lagonoy Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Tinambac Campus
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Planners for Future Generation and Development (PFGeD)', NULL, 'Tinambac Campus', false),
('Eco Warriors', NULL, 'Tinambac Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Caramoan Campus
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Conservationists and Restoration Ecologists Society of Biology Students (CRESBios)', NULL, 'Caramoan Campus', false),
('Campus Society of Hospitality Management (CSHM)', NULL, 'Caramoan Campus', false),
('Sustainable Tourism Student Association (STSA)', NULL, 'Caramoan Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Interest Groups (Goa Campus)
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Angat Gen-C', 'Interest Groups', 'Goa Campus', false),
('ParSU Remontados', 'Interest Groups', 'Goa Campus', false),
('Performing Arts Organization', 'Interest Groups', 'Goa Campus', false),
('Every Nation Campus (ENC)', 'Interest Groups', 'Goa Campus', false),
('Light Source Christian Fellowship (LSCF)', 'Interest Groups', 'Goa Campus', false),
('Peer Facilitator Group (PFG)', 'Interest Groups', 'Goa Campus', false),
('Rotaract Club of Partido', 'Interest Groups', 'Goa Campus', false),
('The Shepherd''s Voice College Campus Ministry', 'Interest Groups', 'Goa Campus', false),
('ParSU-College Red Cross Youth Council (CRCYC)', 'Interest Groups', 'Goa Campus', false),
('Adventist Ministry to College and University Students ParSU Chapter (AMiCUS)', 'Interest Groups', 'Goa Campus', false),
('Bible Grace Campus Ministry', 'Interest Groups', 'Goa Campus', false),
('Gryphon Fire Volunteer and Rescue Bicol R5', 'Interest Groups', 'Goa Campus', false),
('Okinawa Shorin-Ryu Clan Elopre-HA (OSC)', 'Interest Groups', 'Goa Campus', false),
('ParSU Campus Ministry Organization', 'Interest Groups', 'Goa Campus', false),
('Progressive Rainbow, Inclusion and Support Movement (PRISM)', 'Interest Groups', 'Goa Campus', false),
('Risk Reduction Alliance of Students (RRAS)', 'Interest Groups', 'Goa Campus', false),
('Symphonic Harmony of Finess and Rhythm (SHOFAR)', 'Interest Groups', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

-- Fraternities & Sororities (Goa Campus)
INSERT INTO organizations (name, category, campus, is_custom) VALUES
('Sarong Banggi Organization International, Inc. - ParSU Chapter (SBOI)', 'Fraternities & Sororities', 'Goa Campus', false),
('Alpha Kappa Rho', 'Fraternities & Sororities', 'Goa Campus', false),
('Tau Gamma Phi/Sigma (ParSU Chapter)', 'Fraternities & Sororities', 'Goa Campus', false),
('Deltha Rho Fraternity and Sorority, Inc. – ParSU Chapter', 'Fraternities & Sororities', 'Goa Campus', false)
ON CONFLICT (name) DO NOTHING;

