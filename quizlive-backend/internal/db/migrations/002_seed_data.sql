-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
  -- Category IDs
  cat_science  UUID;
  cat_geo      UUID;
  cat_history  UUID;
  cat_tech     UUID;
  cat_sport    UUID;
  cat_arts     UUID;

  -- Working variables (reused per question)
  q_id  UUID;
  opt_a UUID;
  opt_b UUID;
  opt_c UUID;
  opt_d UUID;
  opt_e UUID;
BEGIN

  -- ─────────────────────────────────────────
  -- CATEGORIES
  -- ─────────────────────────────────────────
  INSERT INTO categories (name, icon, color) VALUES ('Science & Nature',     '🔬', '#10b981') RETURNING id INTO cat_science;
  INSERT INTO categories (name, icon, color) VALUES ('Geography & World',    '🌍', '#06b6d4') RETURNING id INTO cat_geo;
  INSERT INTO categories (name, icon, color) VALUES ('History & Culture',    '📚', '#f59e0b') RETURNING id INTO cat_history;
  INSERT INTO categories (name, icon, color) VALUES ('Technology',           '💻', '#6557fb') RETURNING id INTO cat_tech;
  INSERT INTO categories (name, icon, color) VALUES ('Sport & Records',      '🏆', '#e85d24') RETURNING id INTO cat_sport;
  INSERT INTO categories (name, icon, color) VALUES ('Arts & Entertainment', '🎨', '#ec4899') RETURNING id INTO cat_arts;


  -- ═════════════════════════════════════════
  -- MULTIPLE CHOICE  (10 questions)
  -- ═════════════════════════════════════════

  -- 1. Chemical symbol for gold
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_choice', 'What is the chemical symbol for gold?', 'easy', '{}', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Au', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Ag', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Fe', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Cu', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 2. Largest planet
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_choice', 'Which is the largest planet in our Solar System?', 'easy', '{}', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Saturn', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Jupiter', 1) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Uranus', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Neptune', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 3. Insulin-producing organ
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_choice', 'Which organ in the human body produces insulin?', 'medium', '{}',
            'The pancreas secretes insulin to regulate blood sugar levels.', 30, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Liver', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Kidney', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Pancreas', 2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Heart', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 4. Mona Lisa painter
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_arts, 'multiple_choice', 'Who painted the Mona Lisa?', 'easy', '{}', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Michelangelo', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Rembrandt', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Leonardo da Vinci', 2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Pablo Picasso', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 5. George Orwell — 1984
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_arts, 'multiple_choice', 'Who wrote the dystopian novel "Nineteen Eighty-Four" (1984)?', 'medium', '{}', 30, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Aldous Huxley', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'George Orwell', 1) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Franz Kafka', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Ernest Hemingway', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 6. Country that invented paper
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'multiple_choice', 'Which country invented paper around 100 BC?', 'medium', '{}',
            'Paper was invented in ancient China during the Han dynasty.', 30, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Egypt', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Greece', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'India', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'China', 3) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 7. Currency of Japan
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_geo, 'multiple_choice', 'What is the official currency of Japan?', 'easy', '{}', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Yuan', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Won', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Yen', 2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Baht', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 8. Speed of light
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_choice', 'Approximately how fast does light travel in a vacuum (km/s)?', 'medium', '{}',
            'Light travels at approximately 299,792 km/s — commonly rounded to 300,000 km/s.', 30, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '3,000 km/s', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '30,000 km/s', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '300,000 km/s', 2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '3,000,000 km/s', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 9. Hardest natural substance
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_choice', 'What is the hardest natural substance on Earth?', 'easy', '{}', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Diamond', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Titanium', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Quartz', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Ruby', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 10. How many sides on a hexagon?
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_choice', 'How many sides does a hexagon have?', 'easy', '{}', 15, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '5', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '6', 1) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '7', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, '8', 3);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;


  -- ═════════════════════════════════════════
  -- TRUE / FALSE  (10 questions)
  -- ═════════════════════════════════════════

  -- 1. Great Wall visible from space
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'true_false', 'The Great Wall of China is visible from space with the naked eye.', 'easy', '{}',
            'This is a popular myth. Astronauts and NASA have confirmed it cannot be seen from space.', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 2. Humans share DNA with chimps
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'true_false', 'Humans share approximately 98% of their DNA with chimpanzees.', 'medium', '{}',
            'True — humans and chimps share roughly 98.7% of their DNA sequence.', 25, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 3. Lightning never strikes twice
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'true_false', 'Lightning never strikes the same place twice.', 'easy', '{}',
            'False — lightning frequently strikes the same place multiple times. The Empire State Building is struck around 20–25 times per year.', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 4. Amazon flows into Atlantic
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_geo, 'true_false', 'The Amazon River flows into the Atlantic Ocean.', 'medium', '{}', 25, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 5. Bats are blind
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'true_false', 'Bats are completely blind.', 'medium', '{}',
            'False — all bat species can see. Many also use echolocation to navigate in the dark.', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 6. Capital of Australia
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'true_false', 'The capital city of Australia is Sydney.', 'easy', '{}',
            'False — the capital of Australia is Canberra, not Sydney.', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 7. Honey never expires
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'true_false', 'Honey can last thousands of years without spoiling.', 'medium', '{}',
            'True — archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.', 25, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 8. Berlin Wall fell in 1989
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_history, 'true_false', 'The Berlin Wall fell in 1989.', 'easy', '{}', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 9. Water boils at 100°C at sea level
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_science, 'true_false', 'Water boils at 100°C (212°F) at sea level.', 'easy', '{}', 15, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1);
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;

  -- 10. Pluto is a planet
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'true_false', 'Pluto is classified as a full planet in our Solar System.', 'easy', '{}',
            'False — in 2006, the IAU reclassified Pluto as a "dwarf planet".', 20, 100)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'True', 0);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'False', 1) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('option_id', opt_a) WHERE id = q_id;


  -- ═════════════════════════════════════════
  -- MULTIPLE SELECT  (10 questions)
  -- ═════════════════════════════════════════

  -- 1. Noble gases
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_select', 'Which of the following are noble gases?', 'medium', '{}',
            'Noble gases: Helium, Neon, Argon, Krypton, Xenon, Radon.', 30, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Helium', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Neon', 1)   RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Oxygen', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Nitrogen', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Argon', 4)  RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 2. Countries in South America
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, time_limit_seconds, points_value)
    VALUES (cat_geo, 'multiple_select', 'Which of the following countries are located in South America?', 'easy', '{}', 25, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Brazil', 0)    RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Mexico', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Argentina', 2) RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Portugal', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Colombia', 4)  RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 3. Programming languages
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_tech, 'multiple_select', 'Which of the following are programming languages?', 'easy', '{}',
            'HTML and Markdown are markup languages, not programming languages.', 25, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Python', 0)     RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'HTML', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'JavaScript', 2) RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Markdown', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Java', 4)        RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 4. Mammals
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_select', 'Which of the following animals are mammals?', 'easy', '{}',
            'Sharks are fish; eagles are birds. Dolphins, bats, and whales are mammals.', 25, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Dolphin', 0) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Shark', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Bat', 2)     RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Eagle', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Whale', 4)   RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 5. Primary colors of light (RGB)
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_select', 'Which of the following are primary colors of light (additive RGB)?', 'medium', '{}',
            'The three primary colors of light are Red, Green, and Blue. Combined they make white.', 30, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Red', 0)    RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Yellow', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Green', 2)  RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Blue', 3)   RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Purple', 4);
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 6. Shakespeare tragedies
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_arts, 'multiple_select', 'Which of the following are Shakespearean tragedies?', 'medium', '{}',
            'A Midsummer Night''s Dream and The Tempest are comedies/romances.', 30, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Hamlet', 0)                      RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Othello', 1)                     RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'A Midsummer Night''s Dream', 2);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Macbeth', 3)                     RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'The Tempest', 4);
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 7. Chemical elements (not compounds)
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_select', 'Which of the following are pure chemical elements?', 'medium', '{}',
            'Water (H₂O) and Salt (NaCl) are compounds, not elements.', 30, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Oxygen', 0)   RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Water', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Carbon', 2)   RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Salt', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Nitrogen', 4) RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 8. Countries that have hosted Summer Olympics
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_sport, 'multiple_select', 'Which of these countries have hosted the Summer Olympic Games?', 'hard', '{}',
            'New Zealand has never hosted the Summer Olympics. Brazil (2016), Spain (1992), Japan (1964 & 2021), Greece (1896 & 2004).', 35, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Brazil', 0)      RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Spain', 1)       RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Japan', 2)       RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'New Zealand', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Greece', 4)      RETURNING id INTO opt_d;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 9. Organs in the human body
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'multiple_select', 'Which of the following are organs in the human body?', 'easy', '{}',
            'Femur and Tibia are bones, not organs.', 25, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Heart', 0)  RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Femur', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Liver', 2)  RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Tibia', 3);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Kidney', 4) RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;

  -- 10. Cyrillic alphabet languages
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_arts, 'multiple_select', 'Which of the following languages use the Cyrillic alphabet?', 'hard', '{}',
            'Polish uses the Latin alphabet. Russian, Bulgarian, and Serbian use Cyrillic.', 35, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Russian', 0)    RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Polish', 1);
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Bulgarian', 2)  RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Serbian', 3)    RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Romanian', 4);
  UPDATE questions SET correct_answer = jsonb_build_object('option_ids', jsonb_build_array(opt_a, opt_b, opt_c)) WHERE id = q_id;


  -- ═════════════════════════════════════════
  -- CLOSEST NUMBER  (10 questions)
  -- ═════════════════════════════════════════

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'closest_number', 'How many bones are in the adult human body?', 'medium',
            '{"target": 206, "unit": "bones"}', 'Adults have 206 bones. Babies are born with around 270–300.', 30, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'closest_number', 'In what year was the Eiffel Tower completed?', 'medium',
            '{"target": 1889, "unit": "year"}', 'The Eiffel Tower was completed on March 31, 1889 for the World''s Fair.', 30, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_sport, 'closest_number', 'How many kilometers long is an official marathon race?', 'easy',
            '{"target": 42, "unit": "km"}', 'A marathon is precisely 42.195 km (26.2 miles), set as the standard distance in 1921.', 25, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'closest_number', 'What is the approximate diameter of the Earth in kilometers?', 'hard',
            '{"target": 12742, "unit": "km"}', 'Earth''s mean diameter is approximately 12,742 km.', 35, 200);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'closest_number', 'How many member states does the United Nations have?', 'hard',
            '{"target": 193, "unit": "countries"}', 'As of 2024, the UN has 193 member states.', 35, 200);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'closest_number', 'How many teeth does a healthy adult human have (including wisdom teeth)?', 'easy',
            '{"target": 32, "unit": "teeth"}', 'Adults have 32 permanent teeth in total, including 4 wisdom teeth.', 25, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'closest_number', 'In what year did World War I begin?', 'easy',
            '{"target": 1914, "unit": "year"}', 'World War I began in July 1914 following the assassination of Archduke Franz Ferdinand.', 25, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'closest_number', 'How many elements are currently on the periodic table?', 'medium',
            '{"target": 118, "unit": "elements"}', 'Element 118 (Oganesson) was added in 2016, completing the 7th period.', 30, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'closest_number', 'What is the average distance from Earth to the Moon in kilometers?', 'hard',
            '{"target": 384400, "unit": "km"}', 'The average Earth-Moon distance is 384,400 km (it varies between 356,500 and 406,700 km).', 35, 200);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_sport, 'closest_number', 'How many players are on a standard football (soccer) team on the field?', 'easy',
            '{"target": 11, "unit": "players"}', 'Each football team fields 11 players, including the goalkeeper.', 15, 100);


  -- ═════════════════════════════════════════
  -- ORDER ITEMS  (10 questions)
  -- For each question the options are stored in a shuffled display order.
  -- correct_answer.ordered_ids reflects the CORRECT sequence.
  -- ═════════════════════════════════════════

  -- 1. Planets from closest to Sun: Mercury, Venus, Earth, Mars
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'order_items', 'Order these planets from CLOSEST to FURTHEST from the Sun.', 'easy', '{}',
            'Mercury → Venus → Earth → Mars', 40, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Earth',   0) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Mars',    1) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Mercury', 2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Venus',   3) RETURNING id INTO opt_b;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 2. Major conflicts chronologically: WWI, WWII, Korean War, Vietnam War
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'order_items', 'Order these conflicts from EARLIEST to LATEST start date.', 'medium', '{}',
            'WWI (1914) → WWII (1939) → Korean War (1950) → Vietnam War (1955)', 45, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Vietnam War',  0) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Korean War',   1) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'World War II', 2) RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'World War I',  3) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 3. Countries by population largest first: China, India, USA, Brazil
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'order_items', 'Order these countries from LARGEST to SMALLEST population.', 'medium', '{}',
            'China (~1.4B) → India (~1.4B, now tied/ahead) → USA (~335M) → Brazil (~215M)', 45, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'USA',    0) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Brazil', 1) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'China',  2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'India',  3) RETURNING id INTO opt_b;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 4. Mountains tallest first: Everest, K2, Kangchenjunga, Lhotse
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'order_items', 'Order these mountains from TALLEST to SHORTEST (by height above sea level).', 'hard', '{}',
            'Everest (8,849m) → K2 (8,611m) → Kangchenjunga (8,586m) → Lhotse (8,516m)', 45, 250)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'K2',             0) RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Lhotse',         1) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Everest',        2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Kangchenjunga',  3) RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 5. Inventions oldest first: Printing Press, Steam Engine, Telephone, Internet
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'order_items', 'Order these inventions from OLDEST to NEWEST.', 'medium', '{}',
            'Printing Press (1440) → Steam Engine (1712) → Telephone (1876) → Internet (1983)', 45, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Internet',       0) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Telephone',      1) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Printing Press', 2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Steam Engine',   3) RETURNING id INTO opt_b;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 6. Planets by size largest first: Jupiter, Saturn, Uranus, Neptune
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'order_items', 'Order these planets from LARGEST to SMALLEST by diameter.', 'medium', '{}',
            'Jupiter (142,984 km) → Saturn (120,536 km) → Uranus (51,118 km) → Neptune (49,528 km)', 40, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Neptune', 0) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Uranus',  1) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Saturn',  2) RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Jupiter', 3) RETURNING id INTO opt_a;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 7. Historical events chronologically: Magna Carta, American Independence, French Revolution, WWI
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'order_items', 'Order these historical events from EARLIEST to LATEST.', 'medium', '{}',
            'Magna Carta (1215) → American Independence (1776) → French Revolution (1789) → WWI (1914)', 45, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'French Revolution',     0) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'World War I',           1) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Magna Carta',           2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'American Independence', 3) RETURNING id INTO opt_b;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 8. Animals by top speed fastest first: Cheetah, Lion, Horse, Human
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'order_items', 'Order these animals from FASTEST to SLOWEST top speed.', 'easy', '{}',
            'Cheetah (120 km/h) → Lion (80 km/h) → Horse (70 km/h) → Human (45 km/h)', 35, 150)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Human',   0) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Cheetah', 1) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Horse',   2) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Lion',    3) RETURNING id INTO opt_b;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 9. Rivers by length longest first: Nile, Amazon, Yangtze, Mississippi
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'order_items', 'Order these rivers from LONGEST to SHORTEST.', 'hard', '{}',
            'Nile (6,650 km) → Amazon (6,400 km) → Yangtze (6,300 km) → Mississippi (3,730 km)', 45, 250)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Amazon',      0) RETURNING id INTO opt_b;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Mississippi', 1) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Nile',        2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Yangtze',     3) RETURNING id INTO opt_c;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;

  -- 10. Programming languages oldest first: C, Python, Java, Swift
  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_tech, 'order_items', 'Order these programming languages from OLDEST to NEWEST (by year first released).', 'medium', '{}',
            'C (1972) → Python (1991) → Java (1995) → Swift (2014)', 45, 200)
    RETURNING id INTO q_id;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Java',   0) RETURNING id INTO opt_c;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Swift',  1) RETURNING id INTO opt_d;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'C',      2) RETURNING id INTO opt_a;
  INSERT INTO question_options (question_id, label, sort_order) VALUES (q_id, 'Python', 3) RETURNING id INTO opt_b;
  UPDATE questions SET correct_answer = jsonb_build_object('ordered_ids', jsonb_build_array(opt_a, opt_b, opt_c, opt_d)) WHERE id = q_id;


  -- ═════════════════════════════════════════
  -- OPEN TEXT  (10 questions)
  -- ═════════════════════════════════════════

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'open_text', 'What is the chemical formula for water?', 'easy',
            '{"reference": "H2O"}', 'Water consists of two hydrogen atoms bonded to one oxygen atom.', 30, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'open_text', 'What is the capital city of Australia?', 'medium',
            '{"reference": "Canberra"}', 'Canberra became the capital in 1913, chosen as a compromise between Sydney and Melbourne.', 30, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'open_text', 'Who invented the telephone?', 'easy',
            '{"reference": "Alexander Graham Bell"}', 'Alexander Graham Bell was awarded the first patent for a telephone in 1876.', 30, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'open_text', 'What is the name of the organelle known as the "powerhouse of the cell"?', 'easy',
            '{"reference": "Mitochondria"}', 'The mitochondria produce ATP, the primary energy currency of the cell.', 25, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_tech, 'open_text', 'What does the acronym "HTTP" stand for?', 'medium',
            '{"reference": "HyperText Transfer Protocol"}', 'HTTP is the foundation of data communication on the World Wide Web.', 35, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'open_text', 'What was the name of the first artificial satellite launched into space?', 'medium',
            '{"reference": "Sputnik"}', 'Sputnik 1 was launched by the Soviet Union on October 4, 1957.', 35, 150);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_history, 'open_text', 'In what year did the Titanic sink?', 'easy',
            '{"reference": "1912"}', 'The Titanic sank on April 15, 1912 after hitting an iceberg on her maiden voyage.', 25, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'open_text', 'What is the longest bone in the human body?', 'medium',
            '{"reference": "Femur"}', 'The femur (thigh bone) is the longest and strongest bone in the human body.', 30, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_science, 'open_text', 'What is the name of the biological process by which plants convert sunlight into food?', 'easy',
            '{"reference": "Photosynthesis"}', 'During photosynthesis, plants use sunlight, water, and CO₂ to produce glucose and oxygen.', 25, 100);

  INSERT INTO questions (category_id, type, title, difficulty, correct_answer, explanation, time_limit_seconds, points_value)
    VALUES (cat_geo, 'open_text', 'What is the name of the largest ocean on Earth?', 'easy',
            '{"reference": "Pacific Ocean"}', 'The Pacific Ocean covers more than 165 million km² — larger than all land masses combined.', 20, 100);

END;
$$;
-- +goose StatementEnd

-- +goose Down
-- Cascading deletes: removing categories will cascade to questions and question_options
DELETE FROM categories WHERE name IN (
  'Science & Nature',
  'Geography & World',
  'History & Culture',
  'Technology',
  'Sport & Records',
  'Arts & Entertainment'
);
