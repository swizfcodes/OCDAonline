-- ============================================================
-- OCDA Seed Data: Contact Us & FAQ
-- Run this once against your ocdadatabase to populate the
-- Contact Us page and FAQ entries managed by the admin panel.
-- ============================================================

USE ocdadatabase;

-- -------------------------------------------------------
-- 1. CONTACT US
--    Deletes any existing contact entry and inserts fresh.
-- -------------------------------------------------------
DELETE FROM notices WHERE type = 'contact';

INSERT INTO notices (title, content, type, created_by)
VALUES (
  'Contact OCDA',
  'TELEPHONE CONTACTS
--------------------------
President:  Brig.Gen Olubumi Akintola (Rtd) — +2348023083977
Secretary:  Dr. Tafa Yusuf               — +2347059949294
Treasurer:  Mr. Peter Adeniyi            — +2348033426653

TRUSTEES
--------------------------
Mr. Muriana Iyuade           — +2348023527881
Mr. Gabriel Ojo Omojola      — +2348064374116
Mr. Adigun Amubieya          — +2347039655265
Chief Adepowon Akibon        — +2348035868181
Chief Ayodele Agunbiade      — +2348033318967

SECRETARIAT
--------------------------
Oloyin Palace, Oyin Akoko

BANK DETAILS
--------------------------
Bank Name    : Wema Bank
Account Name : Oyin Akoko Community Development Association
Account No.  : 0126128202',
  'contact',
  1
);

-- -------------------------------------------------------
-- 2. FAQ ENTRIES
--    Inserts the original hardcoded FAQ questions.
--    Each entry is a separate row (question + answer).
-- -------------------------------------------------------
DELETE FROM notices WHERE type = 'faq';

INSERT INTO notices (title, content, type, created_by) VALUES
(
  'Who is a member?',
  'Anyone that has the interest of the town and has a valid income, and is ready to work with others for the development of Oyin Akoko is qualified to be a member of OCDA.',
  'faq', 1
),
(
  'How do I become a member?',
  'You can register online via the Members section of this website, or contact any executive member directly. You will need to provide your personal details, ward, and quarter information.',
  'faq', 1
),
(
  'What are the membership dues?',
  'Membership dues are determined by the executive committee and communicated to members. Please contact the Treasurer or check the Notices & Events section for the current levy schedule.',
  'faq', 1
),
(
  'How do I pay my dues?',
  'Dues can be paid directly into the OCDA bank account: Wema Bank, Account Name — Oyin Akoko Community Development Association, Account Number — 0126128202. Please use your name and phone number as the payment reference.',
  'faq', 1
),
(
  'How do I update my contact details?',
  'Log in to your member account and use the Update Profile section on your dashboard to change your phone number, address, or other personal information.',
  'faq', 1
),
(
  'Who do I contact if I have a problem with my account?',
  'Please reach out to the Secretary, Dr. Tafa Yusuf, on +2347059949294, or send a message via the Contact Us page.',
  'faq', 1
);

-- -------------------------------------------------------
-- Verify
-- -------------------------------------------------------
SELECT id, type, title, LEFT(content, 60) AS preview, created_at
FROM notices
WHERE type IN ('contact', 'faq')
ORDER BY type, id;
