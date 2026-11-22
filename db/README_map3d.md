# 3D-карта АГОРА ТЕХАС (цифровой двойник)

Внутренний документ — папка `db/` закрыта на сайте (404).

## Где что лежит

| Файл | Что делает |
|---|---|
| `map.html` | Страница /map: переключатель «Спутник / 3D». 3D грузится только при нажатии. |
| `map3d/ui.js` | Интерфейс: табло, поиск, слои, фазы, камеры, компас, ночь, карточка с летописью, SVG-схема без WebGL. Тексты RU/EN (ключи `m3.*`). |
| `map3d/viewer.js` | Сцена three.js 0.170 (CDN jsdelivr, `+esm`): земля, зоны, пути, объекты по `shape`, деревья инстансами, дорога CR 132 и ЛЭП. |
| `map3d/geo.js` | Геометрия участка без three.js: перевод (d, y) ↔ сцена, контур из межевания. |
| `map3d/ground.js` | Сменный модуль земли. Сейчас плоская; для рельефа заменить на карту высот с тем же интерфейсом `makeGround → { object, heightAt }`. |
| `map3d/map3d.css` | Стили 3D-режима, шторка на телефоне, `?embed=1`. |
| `db/010_site_twin.sql` | Таблицы, права (RLS), триггер «статус → запись в летописи», бакет `site-media`. |
| `db/011_site_twin_seed.sql` | Стартовые данные мастер-плана v2. |

## Координаты

- `d` — метры от дороги (восточная граница) на запад, `y` — метры от южной границы на север, высоты в метрах.
- Сцена: 1 единица = 1 м, `X = −d`, север = `−Z`, вверх = `Y`.
- Привязка к межеванию: `x_межевания = 694.687 − d`, `Y = y + southY(x)` (южная линия P3→P6).

## Ссылки

- `/map?view=3d` — сразу 3D.
- `/map?object=lighthouse` — открыть карточку объекта и подлететь к нему.
- `/map?view=3d&embed=1` — только карта на весь экран (для вставки в iframe).

## Видимость

`public` — все; `members` — вошедшие участники; `founders` — только админы.
Жильё основателей (`rv_evgeny`, `cabin_gennady`) — `members`. Точные координаты жилья в карточке не показываются.

## Как вносить изменения

Редактирование на сайте не делаем — правки идут через Claude Code: он пишет SQL, Геннадий запускает его в Supabase → SQL Editor (проект `coohrbdmzfysnenoclbs`). Примеры:

```sql
-- начали строить баню (в летопись автоматически попадёт запись о статусе)
update public.site_objects set status = 'in_progress' where id = 'bath1';

-- запись в летопись с часами труда
insert into public.site_object_events (object_id, happened_on, kind, text, by_name, hours)
values ('bath1', '2027-03-14', 'note', 'Залили фундамент', 'Геннадий и Евгений', 12);

-- часы и стоимость в карточке
update public.site_objects set hours = coalesce(hours, 0) + 12, cost_usd = 850 where id = 'bath1';

-- фото: загрузить в Storage → бакет site-media, вставить публичную ссылку
update public.site_objects set photos = array_append(photos, 'https://coohrbdmzfysnenoclbs.supabase.co/storage/v1/object/public/site-media/bath1/01.jpg') where id = 'bath1';

-- новый объект
insert into public.site_objects (id, name_ru, category, shape, d, y, w, l, h, phase, status)
values ('bench_1', 'Лавочка', 'feature', 'box', 205, 55, 2, 0.6, 0.5, 0, 'planned');
```

Табло «Построено X из Y · Z часов» считает объекты со статусом `done` (кроме резервов) и сумму `hours`.
