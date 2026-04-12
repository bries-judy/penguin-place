-- ═══════════════════════════════════════════
-- PENGUIN PLACE — Admin rol toekennen aan judy.arina@gmail.com
-- ═══════════════════════════════════════════

-- Beheerder-rol toekennen
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'beheerder'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'judy.arina@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Toegang tot alle locaties
INSERT INTO public.user_locatie_toegang (user_id, alle_locaties)
SELECT p.id, true
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'judy.arina@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_locatie_toegang
  WHERE user_id = p.id AND alle_locaties = true
);
