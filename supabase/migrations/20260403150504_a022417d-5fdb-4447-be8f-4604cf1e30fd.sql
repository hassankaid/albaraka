
-- Réaffecter 42 leads de Hedi vers Sabrina
UPDATE leads SET assigned_to = '071078ef-04ff-4ddc-9a38-f6ba8e6748c4', assigned_at = NOW(), updated_at = NOW()
WHERE id IN (
  'b9c785ec-ce57-49ad-bea8-36e0436be12b','031fd7dc-f43a-4d63-8a74-5f0578e3b753','24e0ae37-2c22-425f-9745-8eb7becb6537',
  '01d0b03f-8fa1-44b9-971c-a32b04114121','358dc17e-894a-4043-aba9-4a96662c0722','c09984af-5954-4dff-a2a5-2d5dcc31b13e',
  '54016d46-3118-4ead-9fe3-fb387afefcf1','d294eaa2-e384-4ce4-a67b-2aae4c6ff6a0','ef35c591-4279-400a-92cc-0176c5faafdc',
  '8f322e96-c1f0-4f0c-aa3b-f2103145abe2','a55372f5-82c9-498f-9056-851fcc05e67d','205de643-5ce6-469e-9794-d668fa3e7a57',
  '1944c775-0aae-4edb-9e33-369c1022428c','0f6e6458-1f67-4379-8ec7-871b508b44b1','983e6f15-2218-43b8-851e-6ce68c830ced',
  '34e0bfe2-3ed2-4388-be12-d2099b1edf10','23b63ee7-21b3-4c7d-82d6-2a79db8f2550','55621e79-9d9a-491c-81f4-08c6a3c1e499',
  '1bf5c095-b36b-4f53-89e5-974a6c28f7e6','5ae983d6-1b38-4249-90a9-5e2dd40a513a','70f19cb7-2b8c-4d4c-bd3d-b8c6fcc27218',
  '5d5da9b9-0ed0-48d5-bfc9-13d386b80139','11dfd964-04f5-4b73-90b1-1815175b7d17','e5a18e7c-ccc6-4ac5-901c-0d2d0640e8fb',
  '40bee394-9dd4-4058-9000-8d62b2b27ce3','8cb81777-db79-420a-96d8-ebe7c0d8646e','780b8d10-4d37-48cd-8ea7-54652467be9b',
  'af65e899-3ec6-426c-89a0-ff94c4497d7f','44dbe76f-730d-4989-ba69-519a163ecff7','5cddc7ba-7099-46c1-a399-7b86e885fe6d',
  'a9d4209a-4c51-461e-865a-70165172f104','7a994cc0-939d-476a-ae65-1ea44136cd74','3c2eadbe-914c-409e-90c4-8868e1fe2ede',
  'ff5b5acd-a7a0-4d94-b663-e43aa13d988c','ab668925-4522-4028-af68-1de849f6b0b4','3001fa88-ee3b-4557-a556-619f42808804',
  'c20ae95e-64ee-49f8-9f57-919934cadb96','1e4f07dc-db30-4bde-a665-fdc94311d4c9','7fde5b94-fd6a-49ca-9e67-716ee1c4be2a',
  'c23c720b-3d63-489a-b984-fe0c71ce9a6e','9a4dde3d-ae15-484e-98c5-0bb10d8623aa','fc14fa1f-623d-4d03-a8b5-791b4bb01d28',
  '510f02ec-574a-4292-842d-81a6e26da55e','74e2fd11-2cab-464b-9e45-40627f69f030'
)
AND assigned_to = '533b3a7f-cec4-4d44-8300-a8cd806ddad3';

-- Réaffecter 15 leads de Saba vers Miradie
UPDATE leads SET assigned_to = '016f6199-a0a2-468e-8b36-73d815fb7e50', assigned_at = NOW(), updated_at = NOW()
WHERE id IN (
  '390bd235-38d9-4689-ab46-89702ae55612','7c2e6796-53f7-4037-afdb-8191b66a3bf0','c0cc53ab-79bf-4adc-94aa-af27c2de0e47',
  '68497cf2-f0e6-47f6-9e88-9a3da3366b45','2590daba-61a3-4cf1-a34c-0238d6d6f107','aea9bebe-b809-4ecc-9f70-51fa7155d2dc',
  '5c79269a-c5e0-4be1-8b76-e5d0c2c84bb2','2cccbd46-14cc-4600-87f2-7eb11a0db87a','5e70eeaf-ebf8-46b0-93c3-87ce624abf34',
  '593edcc0-ba83-4fe1-af42-bd8d4f216187','339154c6-cc19-4a0d-9e99-64d52037460b','d05c2b91-ca7e-4595-b191-80e8c285a8a5',
  '9cad874a-69c1-4adc-990b-1c79cc8d7b85','fe6f4fcc-214a-4d07-80a7-af7a6e514572','a883a45e-000b-47c7-b147-a27bc21d6244'
)
AND assigned_to = '943cbac1-284f-4971-a369-3ffa6cdaf560';

-- Logs d'activité - Sabrina (user_id = CEO Sidali)
INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
SELECT id, '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'reassigned', '533b3a7f-cec4-4d44-8300-a8cd806ddad3', '071078ef-04ff-4ddc-9a38-f6ba8e6748c4', 'Correction : réaffectation vers Sabrina (doublon mass-assign)'
FROM leads WHERE id IN (
  'b9c785ec-ce57-49ad-bea8-36e0436be12b','031fd7dc-f43a-4d63-8a74-5f0578e3b753','24e0ae37-2c22-425f-9745-8eb7becb6537',
  '01d0b03f-8fa1-44b9-971c-a32b04114121','358dc17e-894a-4043-aba9-4a96662c0722','c09984af-5954-4dff-a2a5-2d5dcc31b13e',
  '54016d46-3118-4ead-9fe3-fb387afefcf1','d294eaa2-e384-4ce4-a67b-2aae4c6ff6a0','ef35c591-4279-400a-92cc-0176c5faafdc',
  '8f322e96-c1f0-4f0c-aa3b-f2103145abe2','a55372f5-82c9-498f-9056-851fcc05e67d','205de643-5ce6-469e-9794-d668fa3e7a57',
  '1944c775-0aae-4edb-9e33-369c1022428c','0f6e6458-1f67-4379-8ec7-871b508b44b1','983e6f15-2218-43b8-851e-6ce68c830ced',
  '34e0bfe2-3ed2-4388-be12-d2099b1edf10','23b63ee7-21b3-4c7d-82d6-2a79db8f2550','55621e79-9d9a-491c-81f4-08c6a3c1e499',
  '1bf5c095-b36b-4f53-89e5-974a6c28f7e6','5ae983d6-1b38-4249-90a9-5e2dd40a513a','70f19cb7-2b8c-4d4c-bd3d-b8c6fcc27218',
  '5d5da9b9-0ed0-48d5-bfc9-13d386b80139','11dfd964-04f5-4b73-90b1-1815175b7d17','e5a18e7c-ccc6-4ac5-901c-0d2d0640e8fb',
  '40bee394-9dd4-4058-9000-8d62b2b27ce3','8cb81777-db79-420a-96d8-ebe7c0d8646e','780b8d10-4d37-48cd-8ea7-54652467be9b',
  'af65e899-3ec6-426c-89a0-ff94c4497d7f','44dbe76f-730d-4989-ba69-519a163ecff7','5cddc7ba-7099-46c1-a399-7b86e885fe6d',
  'a9d4209a-4c51-461e-865a-70165172f104','7a994cc0-939d-476a-ae65-1ea44136cd74','3c2eadbe-914c-409e-90c4-8868e1fe2ede',
  'ff5b5acd-a7a0-4d94-b663-e43aa13d988c','ab668925-4522-4028-af68-1de849f6b0b4','3001fa88-ee3b-4557-a556-619f42808804',
  'c20ae95e-64ee-49f8-9f57-919934cadb96','1e4f07dc-db30-4bde-a665-fdc94311d4c9','7fde5b94-fd6a-49ca-9e67-716ee1c4be2a',
  'c23c720b-3d63-489a-b984-fe0c71ce9a6e','9a4dde3d-ae15-484e-98c5-0bb10d8623aa','fc14fa1f-623d-4d03-a8b5-791b4bb01d28',
  '510f02ec-574a-4292-842d-81a6e26da55e','74e2fd11-2cab-464b-9e45-40627f69f030'
);

-- Logs d'activité - Miradie
INSERT INTO lead_activities (lead_id, user_id, action, old_value, new_value, note)
SELECT id, '37a05543-77eb-405e-87c8-2cac8d75fa5c', 'reassigned', '943cbac1-284f-4971-a369-3ffa6cdaf560', '016f6199-a0a2-468e-8b36-73d815fb7e50', 'Correction : réaffectation vers Miradie (doublon mass-assign)'
FROM leads WHERE id IN (
  '390bd235-38d9-4689-ab46-89702ae55612','7c2e6796-53f7-4037-afdb-8191b66a3bf0','c0cc53ab-79bf-4adc-94aa-af27c2de0e47',
  '68497cf2-f0e6-47f6-9e88-9a3da3366b45','2590daba-61a3-4cf1-a34c-0238d6d6f107','aea9bebe-b809-4ecc-9f70-51fa7155d2dc',
  '5c79269a-c5e0-4be1-8b76-e5d0c2c84bb2','2cccbd46-14cc-4600-87f2-7eb11a0db87a','5e70eeaf-ebf8-46b0-93c3-87ce624abf34',
  '593edcc0-ba83-4fe1-af42-bd8d4f216187','339154c6-cc19-4a0d-9e99-64d52037460b','d05c2b91-ca7e-4595-b191-80e8c285a8a5',
  '9cad874a-69c1-4adc-990b-1c79cc8d7b85','fe6f4fcc-214a-4d07-80a7-af7a6e514572','a883a45e-000b-47c7-b147-a27bc21d6244'
);
