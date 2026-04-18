-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 041: Kibeo demo-organisatie verwijderen
-- ═══════════════════════════════════════════════════════════════
--
-- Verwijdert de Kibeo-demo-organisatie (id 00000000-...-0001) en alle
-- bijbehorende data die door migraties 003, 005, 007, 014, 018, 028
-- en seed-ouderportaal.mjs is aangemaakt.
--
-- RATIO: Kibeo is een potentiële klant, geen demo-organisatie. We
-- werken voortaan met één demo-organisatie: Penguin Place Kinderopvang
-- (id a1b2c3d4-...-0001). Door dit als migratie uit te voeren zorgen
-- we dat óók fresh installs eindigen met alleen Penguin Place.
--
-- Idempotent: alle statements zijn veilig om meerdere keren te draaien.
-- Als Kibeo er al niet is, doet deze migratie niks.
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_kibeo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_locatie_ids UUID[];
  v_groep_ids UUID[];
  v_kind_ids UUID[];
  v_ouder_ids UUID[];
  v_staff_ids UUID[];
  v_invoice_ids UUID[];
  v_contract_ids UUID[];
  v_dagverslag_ids UUID[];
  v_mededeling_ids UUID[];
  v_email_ids UUID[];
  v_conv_ids UUID[];
BEGIN
  -- Skip als Kibeo al weg is.
  IF NOT EXISTS (SELECT 1 FROM public.organisaties WHERE id = v_kibeo_id) THEN
    RAISE NOTICE 'Kibeo-organisatie bestaat niet — migratie 041 skipt.';
    RETURN;
  END IF;

  -- ID-lijsten verzamelen
  SELECT array_agg(id) INTO v_locatie_ids   FROM public.locaties         WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_kind_ids      FROM public.kinderen         WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_ouder_ids     FROM public.ouder_profielen  WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_staff_ids     FROM public.profiles         WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_invoice_ids   FROM public.invoices         WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_dagverslag_ids FROM public.dagverslagen    WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_mededeling_ids FROM public.mededelingen    WHERE organisatie_id = v_kibeo_id;
  SELECT array_agg(id) INTO v_conv_ids      FROM public.conversations    WHERE organisatie_id = v_kibeo_id;

  SELECT array_agg(id) INTO v_groep_ids
    FROM public.groepen
    WHERE locatie_id = ANY(COALESCE(v_locatie_ids, ARRAY[]::UUID[]));

  SELECT array_agg(c.id) INTO v_contract_ids
    FROM public.contracten c
    WHERE c.kind_id = ANY(COALESCE(v_kind_ids, ARRAY[]::UUID[]))
       OR c.locatie_id = ANY(COALESCE(v_locatie_ids, ARRAY[]::UUID[]))
       OR (c.groep_id IS NOT NULL AND c.groep_id = ANY(COALESCE(v_groep_ids, ARRAY[]::UUID[])));

  -- Transitieve, non-cascade tabellen (volgorde matters)
  DELETE FROM public.invoice_lines      WHERE invoice_id = ANY(COALESCE(v_invoice_ids, ARRAY[]::UUID[]));
  DELETE FROM public.invoices           WHERE organisatie_id = v_kibeo_id;

  -- Dagverslagen-subtabellen (bestaan mogelijk niet in oudere schema's)
  BEGIN DELETE FROM public.dagverslag_media    WHERE dagverslag_id = ANY(COALESCE(v_dagverslag_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.dagverslag_reacties WHERE dagverslag_id = ANY(COALESCE(v_dagverslag_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM public.dagverslagen       WHERE organisatie_id = v_kibeo_id;

  BEGIN DELETE FROM public.mededelingen_bookmarks WHERE mededeling_id = ANY(COALESCE(v_mededeling_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM public.mededelingen       WHERE organisatie_id = v_kibeo_id;

  BEGIN DELETE FROM public.extra_day_requests WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.contract_events    WHERE contract_id = ANY(COALESCE(v_contract_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Ouder CRM tabellen (Fase 1 + 2a)
  BEGIN
    SELECT array_agg(id) INTO v_email_ids FROM public.ouder_emails WHERE organisatie_id = v_kibeo_id;
    DELETE FROM public.ouder_email_bijlagen WHERE email_id = ANY(COALESCE(v_email_ids, ARRAY[]::UUID[]));
    DELETE FROM public.ouder_emails         WHERE organisatie_id = v_kibeo_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.ouder_memos WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.ouder_audit WHERE ouder_id = ANY(COALESCE(v_ouder_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM public.absence_requests      WHERE kind_id = ANY(COALESCE(v_kind_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.conversation_messages WHERE conversation_id = ANY(COALESCE(v_conv_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.inbox_read_status     WHERE conversation_id = ANY(COALESCE(v_conv_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM public.conversations       WHERE organisatie_id = v_kibeo_id;

  -- Rollen / toegang
  DELETE FROM public.user_roles           WHERE user_id = ANY(COALESCE(v_staff_ids, ARRAY[]::UUID[]));
  DELETE FROM public.user_locatie_toegang WHERE user_id = ANY(COALESCE(v_staff_ids, ARRAY[]::UUID[]));
  BEGIN DELETE FROM public.gebruikers_rollen WHERE user_id = ANY(COALESCE(v_staff_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.rollen            WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Profielen
  DELETE FROM public.ouder_kind      WHERE ouder_id = ANY(COALESCE(v_ouder_ids, ARRAY[]::UUID[]));
  DELETE FROM public.ouder_profielen WHERE organisatie_id = v_kibeo_id;
  DELETE FROM public.profiles        WHERE organisatie_id = v_kibeo_id;

  -- Structuur
  DELETE FROM public.contactpersonen    WHERE kind_id = ANY(COALESCE(v_kind_ids, ARRAY[]::UUID[]));
  BEGIN DELETE FROM public.medisch_gegevens WHERE kind_id = ANY(COALESCE(v_kind_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.adressen         WHERE kind_id = ANY(COALESCE(v_kind_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.planned_attendance WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.placements         WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Contracten: reset self-FK, dan children, dan contracten zelf
  UPDATE public.contracten SET vorige_contract_id = NULL WHERE id = ANY(COALESCE(v_contract_ids, ARRAY[]::UUID[]));
  BEGIN DELETE FROM public.kind_contract_kortingen WHERE kind_contract_id = ANY(COALESCE(v_contract_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.flex_dagen WHERE contract_id = ANY(COALESCE(v_contract_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM public.contracten WHERE id = ANY(COALESCE(v_contract_ids, ARRAY[]::UUID[]));

  DELETE FROM public.wachtlijst    WHERE organisatie_id = v_kibeo_id;
  DELETE FROM public.kinderen      WHERE organisatie_id = v_kibeo_id;
  BEGIN DELETE FROM public.feestdagen WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  DELETE FROM public.groepen                          WHERE locatie_id = ANY(COALESCE(v_locatie_ids, ARRAY[]::UUID[]));
  DELETE FROM public.locatie_openingstijden           WHERE locatie_id = ANY(COALESCE(v_locatie_ids, ARRAY[]::UUID[]));
  BEGIN DELETE FROM public.locatie_openingstijden_uitzonderingen WHERE locatie_id = ANY(COALESCE(v_locatie_ids, ARRAY[]::UUID[])); EXCEPTION WHEN undefined_table THEN NULL; END;
  DELETE FROM public.locaties                         WHERE organisatie_id = v_kibeo_id;

  BEGIN DELETE FROM public.tariefsets    WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.contracttypen WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.merken        WHERE organisatie_id = v_kibeo_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Tot slot: de organisatie zelf
  DELETE FROM public.organisaties WHERE id = v_kibeo_id;

  RAISE NOTICE 'Kibeo-demo-organisatie verwijderd.';
END;
$$;
