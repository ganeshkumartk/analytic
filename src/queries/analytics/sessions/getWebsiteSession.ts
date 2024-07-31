import prisma from 'lib/prisma';
import clickhouse from 'lib/clickhouse';
import { runQuery, PRISMA, CLICKHOUSE } from 'lib/db';

export async function getWebsiteSession(...args: [websiteId: string, sessionId: string]) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(websiteId: string, sessionId: string) {
  return prisma.client.session.findUnique({
    where: {
      id: sessionId,
      websiteId,
    },
  });
}

async function clickhouseQuery(websiteId: string, sessionId: string) {
  const { rawQuery } = clickhouse;

  return rawQuery(
    `
    select
      session_id as id,
      website_id as websiteId,
      hostname,
      browser,
      os,
      device,
      screen,
      language,
      country,
      subdivision1,
      city,
      min(created_at) as firstAt,
      max(created_at) as lastAt,
      uniq(visit_id) as visits,
      sumIf(1, event_type = 1) as views,
      sumIf(1, event_type = 2) as events
    from website_event
    where website_id = {websiteId:UUID}
    and session_id = {sessionId:UUID}
    group by session_id, website_id, hostname, browser, os, device, screen, language, country, subdivision1, city
    `,
    { websiteId, sessionId },
  ).then(result => result?.[0]);
}
