-- Q-Health Seed Data
-- Seed clinics in Tamil Nadu
insert into public.clinics (id, name, location, base_consult_time, doctor_name)
values 
    ('omr-health', 'OMR Health Center', 'Thoraipakkam, Chennai', 10, 'Dr. Arul Kumar (General Physician)'),
    ('kovai-care', 'Kovai Care Clinic', 'Gandhipuram, Coimbatore', 8, 'Dr. Priya Sundaram (Pediatrician)'),
    ('anna-nagar', 'Anna Nagar Family Care', '2nd Avenue, Chennai', 12, 'Dr. Rajesh V (Cardiologist)')
on conflict (id) do update set
    name = excluded.name,
    location = excluded.location,
    base_consult_time = excluded.base_consult_time,
    doctor_name = excluded.doctor_name;

-- Seed initial appointment queue
insert into public.appointments (token_id, patient_name, type, status, clinic_id)
values
    (10, 'Karthik Raja', 'walk-in', 'completed', 'omr-health'),
    (11, 'Ananya Sen', 'online', 'completed', 'omr-health'),
    (12, 'Murugan P', 'walk-in', 'in-progress', 'omr-health'),
    (13, 'Lakshmi Narayanan', 'online', 'waiting', 'omr-health'),
    (14, 'Deepa S', 'walk-in', 'waiting', 'omr-health'),
    (15, 'Venkatesh R', 'online', 'waiting', 'omr-health')
on conflict do nothing;
