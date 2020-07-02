/**
 * MySQL type tests
 *
 * In the future, consider adding types to query-{db}.test.ts, not this file.
 *
 * @group pg
 */


/* eslint-disable import/no-extraneous-dependencies */
import { v4 as uuid } from 'uuid';
import { format, add } from 'date-fns';
import { setupRDSDatabase } from './db';

const getRandomArbitrary = (min: number, max: number): number => Math.random() * (max - min) + min;
const uid = uuid().replace(/-/gi, '');
const d = add(new Date(), { days: 10 });
const i = Math.floor(getRandomArbitrary(1024 * 1024, 0));
const txt = uuid() + uuid() + uuid() + uuid() + uuid() + uuid();
const vc = txt;
const ch = uuid().substr(0, 22);

beforeAll(async () => {
  const rds = setupRDSDatabase().getInstance();
  await rds.query(
    `DROP TABLE IF EXISTS TestType${process.env.JEST_WORKER_ID};
    CREATE TABLE TestType${process.env.JEST_WORKER_ID} (
      id serial PRIMARY KEY,
      bin bytea DEFAULT NULL,
      bool boolean DEFAULT NULL,
      ts timestamp NULL DEFAULT NULL,
      dte timestamp DEFAULT NULL,
      dt date DEFAULT NULL,
      i int DEFAULT NULL,
      txt text,
      ch char(22) DEFAULT NULL,
      vc varchar(1024) DEFAULT NULL
    );`);
});

test('Insert row of unique types', async () => {
  const rds = setupRDSDatabase().getInstance();
  let results = await rds.query(
    `INSERT INTO TestType${process.env.JEST_WORKER_ID} (bin,bool,ts,dte,dt,i,txt,ch,vc)
        VALUES(decode(:uid, 'hex'),true,NOW(),:dte,:dt,:i,:txt,:ch,:vc)
        RETURNING id`,
    { uid, dte: format(d, 'yyyy-MM-dd HH:mm:ss'), dt: format(d, 'yyyy-MM-dd'), i, txt, ch, vc },
  );

  // this is 0 if we have the RETURNING clause
  expect(results.numberOfRecordsUpdated).toBe(0);

  const pk = results.data[0].id.number!;

  results = await rds.query(
    `SELECT id,encode(bin, 'hex') AS b58,bool,ts,dte,dt,i,txt,ch,vc
            FROM TestType${process.env.JEST_WORKER_ID}
            WHERE id = :pk`,
    { pk },
  );

  expect(results.data.length).toBe(1);
  expect(results.columns.length).toBe(10);
  expect(results.insertId).toBe(0);
  expect(results.numberOfRecordsUpdated).toBe(0);

  const row = results.data[0];
  expect(row.id.number).toBe(pk);
  expect(row.b58.string!.toLowerCase()).toBe(uid.toLowerCase());
  expect(row.bool.boolean).toBe(true);
  // TODO
  // expect(row.ts.string).toBe(format(d, 'yyyy-MM-dd HH:mm:ss'));
  expect(row.dte.string).toBe(format(d, 'yyyy-MM-dd HH:mm:ss'));
  expect(row.dt.string).toBe(format(d, 'yyyy-MM-dd'));
  expect(row.i.number).toBe(i);
  expect(row.txt.string).toBe(txt);
  expect(row.ch.string).toBe(ch);
  expect(row.vc.string).toBe(vc);
});
