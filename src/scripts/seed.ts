import { DataSource } from "typeorm";
import { QdrantClient } from "@qdrant/js-client-rest";
import { pipeline } from "@xenova/transformers";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

import { User } from "../users/entities/user.entity";
import { Group } from "../groups/entities/group.entity";
import { GroupMember } from "../groups/entities/group-member.entity";
import { Role } from "../common/enums/role.enum";
import { knowledgeBase } from "../knowledge/knowledge-base";
import { KB_COLLECTION, KB_VECTOR_SIZE } from "../qdrant/qdrant.config";

dotenv.config();

async function seed() {
  // ─── 1. Connect to PostgreSQL ──────────────────────────────────────
  console.log("Connecting to PostgreSQL...");

  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "secret",
    database: process.env.DB_DATABASE || "knowledgehub",
    entities: [User, Group, GroupMember],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log("PostgreSQL connected.\n");

  const userRepo = dataSource.getRepository(User);
  const groupRepo = dataSource.getRepository(Group);
  const memberRepo = dataSource.getRepository(GroupMember);

  // ─── 2. Clear existing data ────────────────────────────────────────
  console.log("Clearing existing data...");
  await memberRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();
  await groupRepo.createQueryBuilder().delete().execute();
  console.log("  Cleared users, groups, and group_members.\n");

  // ─── 3. Seed users ────────────────────────────────────────────────
  console.log("Seeding users...");

  const admin = userRepo.create({
    googleId: "google-admin-dev-001",
    email: "apinya.ttp@gmail.com",
    name: "Admin",
    avatarUrl: null,
    role: Role.ADMIN,
  });

  const user1 = userRepo.create({
    googleId: "google-user1-dev-002",
    email: "user1@acme.dev",
    name: "User 1",
    avatarUrl: null,
    role: Role.USER,
  });

  const user2 = userRepo.create({
    googleId: "google-user2-dev-003",
    email: "user2@acme.dev",
    name: "User 2",
    avatarUrl: null,
    role: Role.USER,
  });

  const savedUsers = await userRepo.save([admin, user1, user2]);
  const [savedAdmin, savedUser1, savedUser2] = savedUsers;
  console.log(`  Seeded ${savedUsers.length} users.\n`);

  // ─── 4. Seed groups ───────────────────────────────────────────────
  console.log("Seeding groups...");

  const engineering = groupRepo.create({
    name: "Engineering",
    emoji: "🛠️",
  });

  const support = groupRepo.create({
    name: "Support",
    emoji: "🎧",
  });

  const savedGroups = await groupRepo.save([engineering, support]);
  const [savedEngineering, savedSupport] = savedGroups;
  console.log(`  Seeded ${savedGroups.length} groups.\n`);

  // ─── 5. Seed group memberships ────────────────────────────────────
  console.log("Seeding group memberships...");

  const memberships = [
    // Admin is member of both groups
    memberRepo.create({
      userId: savedAdmin.id,
      groupId: savedEngineering.id,
    }),
    memberRepo.create({
      userId: savedAdmin.id,
      groupId: savedSupport.id,
    }),
    // User 1 is member of Engineering
    memberRepo.create({
      userId: savedUser1.id,
      groupId: savedEngineering.id,
    }),
    // User 2 is member of Support
    memberRepo.create({
      userId: savedUser2.id,
      groupId: savedSupport.id,
    }),
  ];

  const savedMemberships = await memberRepo.save(memberships);
  console.log(`  Seeded ${savedMemberships.length} memberships.\n`);

  // ─── 6. Connect to Qdrant ─────────────────────────────────────────
  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
  console.log(`Connecting to Qdrant at ${qdrantUrl}...`);
  const qdrant = new QdrantClient({ url: qdrantUrl });

  // Recreate collection
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === KB_COLLECTION);
  if (exists) {
    console.log(`  Deleting existing collection "${KB_COLLECTION}"...`);
    await qdrant.deleteCollection(KB_COLLECTION);
  }

  await qdrant.createCollection(KB_COLLECTION, {
    vectors: { size: KB_VECTOR_SIZE, distance: "Cosine" },
  });

  await qdrant.createPayloadIndex(KB_COLLECTION, {
    field_name: "group_id",
    field_schema: "keyword",
  });
  await qdrant.createPayloadIndex(KB_COLLECTION, {
    field_name: "owner_id",
    field_schema: "keyword",
  });
  await qdrant.createPayloadIndex(KB_COLLECTION, {
    field_name: "updated_at",
    field_schema: "keyword",
  });

  console.log(`  Collection "${KB_COLLECTION}" created with indexes.\n`);

  // ─── 7. Embed and seed knowledge entries ──────────────────────────
  console.log("Loading embedding model (Xenova/all-MiniLM-L6-v2)...");
  const embedPipeline = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );
  console.log("Embedding model loaded.\n");

  console.log("Seeding knowledge entries...");
  const now = new Date().toISOString();
  const points = [];

  for (let i = 0; i < knowledgeBase.length; i++) {
    const entry = knowledgeBase[i];
    const text = `${entry.title}\n${entry.content}\n${entry.tags.join(", ")}`;

    console.log(
      `  Embedding ${i + 1}/${knowledgeBase.length}: ${entry.title}`,
    );
    const output = await embedPipeline(text, {
      pooling: "mean",
      normalize: true,
    });
    const vector = Array.from(output.data as Float32Array);

    // Assign group: company/docs -> Engineering, faq/facts -> Support
    const isEngineering = ["company", "docs"].includes(entry.category);
    const group = isEngineering ? savedEngineering : savedSupport;

    points.push({
      id: uuidv4(),
      vector,
      payload: {
        title: entry.title,
        content: entry.content,
        owner_id: savedAdmin.id,
        owner_name: savedAdmin.name,
        owner_avatar_url: savedAdmin.avatarUrl,
        group_id: group.id,
        group_name: group.name,
        group_emoji: group.emoji,
        created_at: now,
        updated_at: now,
      },
    });
  }

  await qdrant.upsert(KB_COLLECTION, { wait: true, points });
  console.log(`  Seeded ${points.length} knowledge entries.\n`);

  // ─── 8. Clean up ──────────────────────────────────────────────────
  await dataSource.destroy();

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("=== Seed Complete ===");
  console.log(`Users:              ${savedUsers.length}`);
  console.log(`Groups:             ${savedGroups.length}`);
  console.log(`Memberships:        ${savedMemberships.length}`);
  console.log(`Knowledge entries:  ${points.length}`);
  console.log("\nGroup assignments:");
  console.log("  🛠️ Engineering: Admin (admin), User 1 (user)  →  company + docs entries");
  console.log("  🎧 Support:     Admin (admin), User 2 (user)  →  faq + facts entries");
  console.log("\nUsers (login via Google OAuth2):");
  savedUsers.forEach((u) =>
    console.log(`  ${u.name}: ${u.email} (role: ${u.role}, googleId: ${u.googleId})`),
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
