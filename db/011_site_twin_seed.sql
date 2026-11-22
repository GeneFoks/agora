-- ============================================================
-- AGORA — migration 011: стартовые данные цифрового двойника (мастер-план v2, 2026-11-22)
-- Run once AFTER 010. Existing rows are left untouched (on conflict do nothing),
-- so re-running never overwrites what organisers have edited on the site.
-- All positions are planning estimates (d from the road, y from the south line).
-- ============================================================
begin;

insert into public.site_zones (id, name_ru, d_from, d_to, color, no_build, sort) values
  ('z_easement', 'Полоса ЛЭП / easement', 0, 6, '#B4B2A9', false, 1),
  ('z_entry', 'Вход, сервис, основатели', 6, 165, '#D3D1C7', false, 2),
  ('z_bath', 'Банный сад', 165, 250, '#F5C4B3', false, 3),
  ('z_village', 'Деревня', 250, 345, '#CECBF6', false, 4),
  ('z_farm', 'Ферма', 345, 440, '#C0DD97', false, 5),
  ('z_forest', 'Пищевой лес и Звёздная поляна', 440, 555, '#EAF3DE', false, 6),
  ('z_flood', 'Пойма у ручья — без построек', 555, 695, '#B5D4F4', true, 7)
on conflict (id) do nothing;

insert into public.site_paths (id, name_ru, type, phase, status, width, points, closed) values
  ('road_p0', 'Две гравийные колеи до RV', 'ribbon_road', 0, 'planned', 3.6, '[[0,4],[110,4]]'::jsonb, false),
  ('road_p2', 'Дорога 20 ft до разворота', 'road', 2, 'planned', 6, '[[0,4],[262,4]]'::jsonb, false),
  ('turnaround', 'T-разворот пожарной', 'road', 2, 'planned', 6, '[[256,1],[256,37]]'::jsonb, false),
  ('tractor_track', 'Тракторная колея по траве', 'track', 2, 'planned', 3.6, '[[262,3],[440,3]]'::jsonb, false),
  ('hedge_dust', 'Изгородь от пыли', 'hedge', 1, 'planned', 2, '[[30,8],[262,8]]'::jsonb, false),
  ('run_loop', 'Беговое кольцо 1,2 км (скошенная тропа)', 'trail', 1, 'planned', 2, '[[30,11],[555,11],[555,113],[500,138],[450,125],[400,112],[350,101],[300,89],[250,78],[200,66],[150,55],[100,45],[50,36],[30,32]]'::jsonb, true),
  ('run_link_165', 'Перемычка кольца', 'trail', 1, 'planned', 2, '[[165,11],[165,58]]'::jsonb, false),
  ('run_link_265', 'Перемычка кольца', 'trail', 1, 'planned', 2, '[[265,11],[265,81]]'::jsonb, false),
  ('run_flood', 'Хвост к ручью (закрыт после дождя)', 'trail', 1, 'planned', 2, '[[555,11],[610,15],[660,20]]'::jsonb, false),
  ('axis', 'Пешая ось', 'walkway', 0, 'planned', 2, '[[30,22],[70,30],[100,46],[130,49],[200,50],[265,50],[315,50],[345,45],[365,30],[435,30],[470,60],[490,75],[555,70],[620,40]]'::jsonb, false),
  ('trench', 'Общая траншея: кабель + вода', 'utility', 0, 'planned', 0.5, '[[10,9],[180,9]]'::jsonb, false)
on conflict (id) do nothing;

insert into public.site_objects (id, name_ru, category, shape, d, y, w, l, h, h_final, r, sectors, phase, status, built_by, permit, visibility) values
  ('culvert', 'Въезд + culvert', 'infrastructure', 'box', 4, 4.5, 8, 7, 0.2, null, null, null, 0, 'planned', 'Округ или Геннадий и Евгений', 'Driveway Permit + 811', 'public'),
  ('parking_outer', 'Внешняя парковка (14–16 мест)', 'parking', 'box', 17, 17, 18, 26, 0.1, null, null, null, 0, 'planned', 'Геннадий и Евгений', 'Development Permit', 'public'),
  ('gate', 'Ворота-скала (проём 24×16 ft)', 'landmark', 'gate', 29, 14.5, 1.2, 17, 5.5, null, null, null, 1, 'planned', 'Геннадий и Евгений', 'Development Permit', 'public'),
  ('rock_fence_s', 'Забор-скала, южное крыло', 'landmark', 'rock_wall', 29, 3, 1, 6, 1.8, null, null, null, 1, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('rock_fence_n', 'Забор-скала, северное крыло', 'landmark', 'rock_wall', 29, 28, 1, 8, 1.8, null, null, null, 1, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('water_meter', 'Счётчик воды', 'utility', 'box', 5, 25, 0.6, 0.6, 0.4, null, null, null, 0, 'planned', 'Водоканал', null, 'public'),
  ('power_panel', 'Ввод электричества, щит 200 A', 'utility', 'box', 10, 22, 1, 1.5, 1.8, null, null, null, 0, 'planned', 'Лицензированный электрик', null, 'public'),
  ('fire_tank_2500', 'Пожарный резервуар 2 500 гал', 'utility', 'cylinder', 36, 16, null, null, 2.2, null, 1.2, null, 1, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('tea_station', 'Чайная станция и стена даров', 'feature', 'box', 41, 30, 2.4, 6, 2.4, null, null, null, 0, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('toilets', 'Туалеты (аренда → санблок)', 'building', 'box', 45, 30, 3, 6, 2.5, null, null, null, 0, 'planned', null, null, 'public'),
  ('pavilion', 'Павильон 20×40 ft', 'building', 'pavilion', 60, 16, 12.2, 6.1, 4.5, null, null, null, 1, 'planned', 'Геннадий и Евгений', 'Development Permit', 'public'),
  ('kitchen', 'Кухня-контейнер 20 ft', 'building', 'box', 75, 16.2, 6.1, 2.4, 2.6, null, null, null, 1, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('workshop', 'Мастерская и склад', 'building', 'box', 90, 20, 9, 6, 3.5, null, null, null, 0, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('rv_evgeny', 'RV основателя (Евгений)', 'residence', 'box', 104, 30, 12.2, 3.7, 3.5, null, null, null, 0, 'planned', null, null, 'members'),
  ('cabin_gennady', 'Домик Геннадия (12×20 ft, на сваях)', 'residence', 'house', 104, 41, 6.1, 3.7, 3.8, null, null, null, 1, 'planned', 'Геннадий', null, 'members'),
  ('chickens', 'Курятник-трактор', 'farm', 'box', 115, 20, 3.6, 2.4, 1.5, null, null, null, 1, 'planned', null, null, 'public'),
  ('garden', 'Огород основателей', 'farm', 'flat', 118, 36, 12, 16, null, null, null, null, 1, 'planned', null, null, 'public'),
  ('event_parking', 'Парковка событий (газон)', 'parking', 'flat', 145, 27, 40, 26, null, null, null, null, 2, 'planned', null, null, 'public'),
  ('bath1', 'Баня №1 (дровяная) + терраса', 'wellness', 'house', 182, 30.5, 4.8, 2.4, 2.8, null, null, null, 0, 'planned', 'Геннадий и Евгений', 'Development Permit', 'public'),
  ('plunge', 'Купель + лестница температур', 'wellness', 'cylinder', 190, 37, null, null, 0.6, null, 1.2, null, 0, 'planned', null, null, 'public'),
  ('fire_circle', 'Костровая «Круг разговора»', 'feature', 'ring', 200, 50, null, null, 0.4, null, 4, null, 0, 'planned', null, null, 'public'),
  ('bath_reserve', 'Резерв бань №2–4', 'reserve', 'flat_dashed', 222, 44, 35, 32, null, null, null, null, 2, 'planned', null, null, 'public'),
  ('pond', 'Пруд (огороженный)', 'water', 'pond', 232, 60, 15, 10, null, null, null, null, 2, 'planned', null, null, 'public'),
  ('ossf_a', 'Септик A (резерв, по perc test)', 'reserve', 'flat_dashed', 225, 20, 40, 12, null, null, null, null, 1, 'planned', null, 'OSSF', 'public'),
  ('fire_tank_10k', 'Резервуар 10 000 гал', 'utility', 'cylinder', 254, 42, null, null, 3, null, 1.8, null, 2, 'planned', null, null, 'public'),
  ('village_ring', 'Кольцо Деревни Ø50 м', 'landmark', 'ring_path', 290, 50, null, null, null, null, 25, null, 2, 'planned', null, null, 'public'),
  ('lighthouse', 'Башня-Маяк', 'landmark', 'tower', 290, 50, 4, 4, 6, 15, null, null, 1, 'planned', 'Геннадий и Евгений', null, 'public'),
  ('cabin_d1', 'Домик D1', 'lodging', 'house', 272, 68, 5, 4, 3.5, null, null, null, 2, 'planned', null, null, 'public'),
  ('cabin_d2', 'Домик D2', 'lodging', 'house', 290, 75, 5, 4, 3.5, null, null, null, 2, 'planned', null, null, 'public'),
  ('cabin_d3', 'Домик D3', 'lodging', 'house', 308, 68, 5, 4, 3.5, null, null, null, 2, 'planned', null, null, 'public'),
  ('cabin_d4', 'Домик D4', 'lodging', 'house', 315, 50, 5, 4, 3.5, null, null, null, 2, 'planned', null, null, 'public'),
  ('cabin_d5', 'Домик D5', 'lodging', 'house', 308, 32, 5, 4, 3.5, null, null, null, 2, 'planned', null, null, 'public'),
  ('cabin_d6', 'Домик D6', 'lodging', 'house', 290, 25, 5, 4, 3.5, null, null, null, 3, 'planned', null, null, 'public'),
  ('cabin_d7', 'Домик D7', 'lodging', 'house', 272, 32, 5, 4, 3.5, null, null, null, 3, 'planned', null, null, 'public'),
  ('village_wc', 'Санблок Деревни', 'building', 'box', 321, 18, 6, 6, 3, null, null, null, 2, 'planned', null, null, 'public'),
  ('ossf_b', 'Септик B (резерв)', 'reserve', 'flat_dashed', 332, 81, 25, 22, null, null, null, null, 2, 'planned', null, null, 'public'),
  ('barn', 'Сарай-хаб фермы', 'farm', 'house', 354, 19, 12, 9, 4.5, null, null, null, 2, 'planned', null, null, 'public'),
  ('greenhouse', 'Теплица', 'farm', 'greenhouse', 371, 18, 12, 6, 3, null, null, null, 2, 'planned', null, null, 'public'),
  ('grazing_wheel', 'Колесо ротационного выпаса (8 секторов)', 'farm', 'ring_sectors', 400, 70, null, null, null, null, 35, 8, 2, 'planned', null, null, 'public'),
  ('hives', 'Ульи', 'farm', 'box', 440, 112, 3, 3, 0.8, null, null, null, 2, 'planned', null, null, 'public'),
  ('star_field', 'Звёздная поляна', 'feature', 'ring_path', 490, 80, null, null, null, null, 15, null, 0, 'planned', null, null, 'public'),
  ('creek_gauge', 'Датчик уровня ручья', 'utility', 'pole', 640, 35, null, null, 2, null, null, null, 1, 'planned', null, null, 'public')
on conflict (id) do nothing;

insert into public.site_tree_areas (id, name_ru, type, d_from, d_to, "offset", spacing, count, exclude, phase) values
  ('windbreak_north', 'Ветролом вдоль северной границы', 'line_offset_from_north', 30, 350, 3, 8, null, '[]'::jsonb, 1),
  ('food_forest', 'Пищевой лес', 'scatter', 440, 550, null, null, 60, '["star_field"]'::jsonb, 1)
on conflict (id) do nothing;

commit;
