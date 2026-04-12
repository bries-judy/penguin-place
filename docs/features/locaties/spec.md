# Locaties Module — Datamodel & UI Structuur
**Kinderopvang SaaS | Planning · Facturatie · CRM**
Versie: 1.0 | Datum: 2026-04-12

---

## 1. Entiteitenhiërarchie

```
Organization
  └── Location
        ├── LocationOpeningHours        (7 records per locatie, één per weekdag)
        ├── LocationOpeningHoursException (sluitingsdagen / afwijkingen)
        └── LocationGroup
              └── (relatie naar: Planning, Kinddossier, Facturatie)
```

---

## 2. Datamodel

### 2.1 `Location`

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `id` | UUID | ✅ | Primary key |
| `organization_id` | UUID (FK → Organization) | ✅ | |
| `name` | String | ✅ | Weergavenaam vestiging |
| `code` | String (unique per org) | ✅ | Auto-gegenereerd, bijv. `MDL-001` |
| `type` | Enum | ✅ | Zie enum `LocationType` |
| `status` | Enum | ✅ | Zie enum `LocationStatus` |
| `street` | String | ✅ | |
| `house_number` | String | ✅ | Inclusief toevoeging |
| `postal_code` | String | ✅ | NL: 1234 AB formaat |
| `city` | String | ✅ | |
| `country` | String | ✅ | Default: `NL` |
| `phone` | String | ✅ | |
| `email` | String | ✅ | Functioneel adres vestiging |
| `website` | String | ❌ | |
| `lrk_number` | String (unique) | ✅ | LRK-registratienummer — wettelijk verplicht |
| `ggd_region` | String | ❌ | |
| `last_inspection_date` | Date | ❌ | |
| `last_inspection_result` | Enum | ❌ | Zie enum `InspectionResult` |
| `next_inspection_date` | Date | ❌ | |
| `permit_valid_until` | Date | ❌ | |
| `cao` | Enum | ❌ | Zie enum `CaoType` |
| `location_manager_id` | UUID (FK → User) | ❌ | |
| `deputy_manager_id` | UUID (FK → User) | ❌ | |
| `emergency_contact_name` | String | ❌ | |
| `emergency_contact_phone` | String | ❌ | |
| `billing_entity_id` | UUID (FK → BillingEntity) | ❌ | Juridische entiteit die factureert |
| `rate_model_id` | UUID (FK → RateModel) | ❌ | Koppeling naar tariefkaart |
| `iban` | String | ❌ | Alleen invullen als locatie eigen IBAN heeft |
| `kvk_number` | String | ❌ | Alleen als locatie aparte entiteit is |
| `outdoor_space` | Boolean | ✅ | Default: false |
| `outdoor_space_sqm` | Decimal | ❌ | Alleen zichtbaar als outdoor_space = true |
| `has_kitchen` | Boolean | ✅ | Default: false |
| `wheelchair_accessible` | Boolean | ✅ | Default: false |
| `parking_spots` | Integer | ❌ | |
| `notes` | Text | ❌ | Interne notities |
| `created_at` | DateTime | ✅ | Auto |
| `updated_at` | DateTime | ✅ | Auto |
| `deleted_at` | DateTime | ❌ | Soft delete |

**Enums:**

```
LocationType:       KDV | BSO | PEUTERSPEELZAAL | GASTOUDER | COMBINATIE
LocationStatus:     ACTIVE | INACTIVE | IN_DEVELOPMENT
InspectionResult:   GOOD | SUFFICIENT | INSUFFICIENT
CaoType:            KINDEROPVANG | SOCIAAL_WERK | OTHER
```

---

### 2.2 `LocationGroup`

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `id` | UUID | ✅ | Primary key |
| `location_id` | UUID (FK → Location) | ✅ | |
| `name` | String | ✅ | Bijv. "Babygroep Zon" |
| `type` | Enum | ✅ | Zie enum `GroupType` |
| `min_age_months` | Integer | ✅ | In maanden |
| `max_age_months` | Integer | ✅ | In maanden |
| `max_capacity` | Integer | ✅ | Max aantal kinderen |
| `sqm` | Decimal | ✅ | Beschikbare vloeroppervlakte |
| `sqm_per_child` | Decimal (calculated) | — | `sqm / max_capacity` |
| `bkr_ratio` | String | ✅ | Bijv. "1:3", "1:5" |
| `room_name` | String | ❌ | Naam van de ruimte |
| `status` | Enum | ✅ | Zie enum `GroupStatus` |
| `notes` | Text | ❌ | |
| `created_at` | DateTime | ✅ | Auto |
| `updated_at` | DateTime | ✅ | Auto |
| `deleted_at` | DateTime | ❌ | Soft delete |

**Enums:**

```
GroupType:    BABY_0_1 | TODDLER_1_2 | PRESCHOOL_2_4 | BSO | HORIZONTAL | VERTICAL
GroupStatus:  ACTIVE | CLOSED | WAITLIST_ONLY
```

---

### 2.3 `LocationOpeningHours`

7 vaste records per locatie (één per weekdag). Worden aangemaakt bij het aanmaken van een locatie.

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `id` | UUID | ✅ | |
| `location_id` | UUID (FK → Location) | ✅ | |
| `day_of_week` | Enum | ✅ | MON / TUE / WED / THU / FRI / SAT / SUN |
| `is_open` | Boolean | ✅ | Default: false voor SAT/SUN, true voor ma-vr |
| `open_time` | Time | ❌ | Nullable als is_open = false |
| `close_time` | Time | ❌ | Nullable als is_open = false |

---

### 2.4 `LocationOpeningHoursException`

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `id` | UUID | ✅ | |
| `location_id` | UUID (FK → Location) | ✅ | |
| `start_date` | Date | ✅ | |
| `end_date` | Date | ✅ | |
| `is_closed` | Boolean | ✅ | true = geheel gesloten, false = aangepaste tijden |
| `open_time` | Time | ❌ | Alleen invullen als is_closed = false |
| `close_time` | Time | ❌ | Alleen invullen als is_closed = false |
| `description` | String | ✅ | Bijv. "Zomervakantie 2026", "Carnaval" |

---

### 2.5 Permissions (RBAC)

| Permission key | Beschrijving |
|---|---|
| `locations:view` | Locaties bekijken |
| `locations:create` | Nieuwe locatie aanmaken |
| `locations:edit` | Locatiegegevens bewerken |
| `locations:delete` | Locatie deactiveren (soft delete) |
| `locations.groups:view` | Groepen bekijken |
| `locations.groups:edit` | Groepen aanmaken / bewerken / verwijderen |
| `locations.compliance:view` | Compliance-informatie bekijken (LRK, GGD) |
| `locations.compliance:edit` | Compliance-informatie bewerken |
| `locations.billing:view` | Factuurinstellingen bekijken |
| `locations.billing:edit` | Factuurinstellingen bewerken |
| `locations.opening_hours:edit` | Openingstijden bewerken |

**Standaard rolkoppelingen (suggestie):**

| Rol | Permissions |
|---|---|
| Superadmin | Alles |
| Organisatiebeheerder | Alles behalve `locations:delete` |
| Locatiemanager | `view`, `edit` (geen compliance/billing/delete) |
| Medewerker | `view` only |

---

## 3. UI-structuur

### 3.1 Locatielijst (overzicht)

**Route:** `/locations`

**Componenten:**
- Zoekbalk (op naam, code, stad)
- Filter: Type locatie | Status | Organisatie
- Tabel / kaartweergave toggle
- Kolommen: Naam | Code | Type | Stad | Status | Manager | Acties
- CTA: "Nieuwe locatie toevoegen" (vereist `locations:create`)

---

### 3.2 Locatiedetail — Tabstructuur

**Route:** `/locations/:id`

Header: Locatienaam + Code + Status badge + Type badge + snelknoppen (Bewerken / Deactiveren)

#### Tab 1 — Algemeen

Secties:
- **Basisgegevens**: Naam, Code (readonly), Type, Status
- **Adres**: Straat + huisnummer, Postcode, Stad, Land
- **Contact**: Telefoonnummer, E-mailadres, Website
- **Faciliteiten**: Buitenspeelruimte (toggle + m²), Keuken, Toegankelijkheid, Parkeerplaatsen
- **Interne notities**: Vrij tekstveld

Rechten: Zichtbaar voor alle rollen met `locations:view`. Bewerkbaar met `locations:edit`.

---

#### Tab 2 — Openingstijden

Secties:
- **Reguliere openingstijden**: 7 rijen (ma t/m zo), per rij: open/gesloten toggle + tijden
- **Uitzonderingen & Sluitingsdagen**: Tabel met datumrange + omschrijving + type (gesloten / aangepaste tijden). Toevoegen, bewerken, verwijderen per regel.

Rechten: Bewerkbaar met `locations.opening_hours:edit`.

---

#### Tab 3 — Groepen

Secties:
- **Groepenlijst**: Tabel met kolommen: Naam | Type | Leeftijd | Capaciteit | m² | m²/kind | BKR | Status
- **Detail / bewerken per groep**: Inline uitklap of aside panel
- **Nieuwe groep toevoegen**: Knop onderaan tabel

Rechten: Bewerkbaar met `locations.groups:edit`.

---

#### Tab 4 — Compliance

Secties:
- **Registratie**: LRK-nummer (met validatie op formaat), GGD-regio
- **Inspecties**: Laatste inspectiedatum + oordeel, Volgende geplande inspectie
- **Vergunning**: Geldig tot (met visuele waarschuwing als < 60 dagen)
- **CAO**: Toepasselijke CAO

Rechten: Zichtbaar met `locations.compliance:view`. Bewerkbaar met `locations.compliance:edit`.

---

#### Tab 5 — Personeel & Beheer

Secties:
- **Verantwoordelijken**: Locatiemanager (user picker), Plaatsvervangend manager (user picker)
- **Noodcontact extern**: Naam + telefoonnummer

Rechten: Bewerkbaar met `locations:edit`.

---

#### Tab 6 — Facturatie-instellingen

Secties:
- **Juridische entiteit**: Koppeling naar BillingEntity
- **Tariefmodel**: Koppeling naar RateModel
- **Financieel**: IBAN (optioneel), KVK-nummer (optioneel)

Rechten: Zichtbaar met `locations.billing:view`. Bewerkbaar met `locations.billing:edit`.

---

### 3.3 Aanmaken nieuwe locatie

**Route:** `/locations/new`

**Wizard (3 stappen):**

1. **Stap 1 — Basisgegevens**: Naam, Type, Adres, Contact
2. **Stap 2 — Openingstijden**: Reguliere tijden instellen
3. **Stap 3 — Eerste groep**: Minimaal één groep aanmaken (optioneel overslaan)

Na aanmaken → redirect naar `/locations/:id` tab Algemeen.

---

### 3.4 Validatieregels (UI + backend)

| Veld | Validatie |
|---|---|
| `lrk_number` | Verplicht, uniek, formaat: 12 cijfers |
| `postal_code` | Formaat: `1234 AB` (NL) |
| `email` | Geldig e-mailadres |
| `open_time` / `close_time` | open_time < close_time |
| `min_age_months` / `max_age_months` | min < max |
| `sqm` | > 0 |
| `max_capacity` | > 0, integer |
| `permit_valid_until` | Waarschuwing als < 60 dagen vanaf vandaag |
| `end_date` (uitzondering) | >= start_date |

---

## 4. Relaties naar andere modules

| Module | Relatie |
|---|---|
| Planning | LocationGroup is de planningseenheid. Planningsblokken valideren tegen openingstijden. |
| Kinddossier | Kind is geplaatst in een LocationGroup (niet direct in Location) |
| Facturatie | Location heeft een rate_model_id en billing_entity_id |
| Medewerkers | User kan location_manager zijn van meerdere locaties |
| Rapportage | GGD-rapportage per locatie, bezettingsgraad per groep |
