/******************************************************************************************
 * XSWIFT PRIVATE VOICE BOT
 * - Private Voice Panel
 * - Voice Manager (Owner)
 * - Voice Stats
 * - Auto Delete Empty Voice
 * - Persistent Panel
 * - Create Voice In Fixed Category
 *
 * ⚠️ IMPORTANT
 * - DO NOT REMOVE ANY PART
 * - ALL TEXTS ARE ORIGINAL (AS REQUESTED)
 * - ONLY ADD SYSTEMS, NEVER DELETE
 ******************************************************************************************/

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType
} from "discord.js";

import { REST } from "@discordjs/rest";
import dotenv from "dotenv";
import fs from "fs-extra";
dotenv.config();

/* =======================================================================================
 * BASIC CONFIG
 * ======================================================================================= */
const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

/**
 * 🔊 FIXED CATEGORY NAME
 * ห้องเสียงที่บอทสร้างทั้งหมดจะอยู่ในหมวดหมู่นี้
 */
const VOICE_CATEGORY_NAME = "🎧 ▬▬▬ • 〔 ห้องเสียงของคุณ 〕   •  ▬▬▬ ꔛ∘";

/* =======================================================================================
 * LOAD CONFIG.JSON
 * ======================================================================================= */
let config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

const save = () => {
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
};

/* =======================================================================================
 * CLIENT
 * ======================================================================================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

/* =======================================================================================
 * SLASH COMMANDS
 * ======================================================================================= */
const commands = [
  new SlashCommandBuilder()
    .setName("privatepanel")
    .setDescription("สร้าง Panel ห้องเสียงส่วนตัว")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("เลือกช่อง Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("voicemanager")
    .setDescription("Panel จัดการห้องเสียง (Owner)"),

  new SlashCommandBuilder()
    .setName("vstats")
    .setDescription("สถิติห้องเสียง (Owner)")
].map(cmd =>
  cmd.setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON()
);

/* =======================================================================================
 * READY EVENT
 * ======================================================================================= */
client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  for (const [guildId] of client.guilds.cache) {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guildId),
      { body: commands }
    );
  }

  console.log("🟢 Bot Online");
});

/* =======================================================================================
 * PRIVATE PANEL / VOICEMANAGER / VSTATS
 * ======================================================================================= */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  if (i.user.id !== ADMIN_ID)
    return i.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  /* ---------------- /privatepanel ---------------- */
  if (i.commandName === "privatepanel") {
    const ch = i.options.getChannel("channel");

    const embed = new EmbedBuilder()
      .setTitle("สร้างห้องเสียงส่วนตัว <a:emoji_27:1449151549602271526>")
      .setDescription(`
** ╭┈ ꒰ <a:3005:1451585834649391144> 𐔌 . ⋮ 𝓑𝔂 𝓩𝓮𝓶𝓸𝓷 Ź𝔁 .ᐟ ָ ₊ ꒱ <a:3007:1451585403751633170> ꒱
> ┃ <a:__:1451387432527335605> • บอทสร้างห้องเสียง
> ┃ <a:1001:1451585309757149227> • ตั้งชื่อ / ล็อคห้อง
> ┃ <a:1002:1451585213560783134> • อนุญาตเพื่อนเข้า
> ┃ <a:1004:1451585026935488563> • จำกัดคนเข้าได้
> ┃ <a:emoji_46:1451252945424351310> • ออนไลน์ 24/7
╰┈ ꒰ <a:__:1451387432527335605> 𐔌 . ⋮ 𝒙𝑺𝒘𝒊𝒇𝒕 𝑯𝒖𝒃 ꒱ **`
);

    const btn = new ButtonBuilder()
      .setCustomId("create_voice")
      .setLabel("สร้างห้อง")
      .setEmoji("<a:DG36:1451619653746036910>")
      .setStyle(ButtonStyle.Primary);

    const msg = await ch.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });

    config.panelChannelId = ch.id;
    config.panelMessageId = msg.id;
    save();

    return i.reply({ content: "✅ สร้าง Panel แล้ว", ephemeral: true });
  }

  /* ---------------- /voicemanager ---------------- */
  if (i.commandName === "voicemanager") {
    const embed = new EmbedBuilder()
      .setTitle("ลบห้องเสียงส่วนตัว <a:emoji_27:1449151549602271526>")
      .setDescription(`
** ╭┈ ꒰ <a:3005:1451585834649391144> PANEL สำหรับ Owner <a:3007:1451585403751633170> ꒱
> ┃ <a:__:1451387432527335605> • ลบห้องเสียงที่สร้าง
> ┃ <a:1001:1451585309757149227> • เลือกหลายห้องได้
> ┃ <a:1004:1451585026935488563> • ยืนยันก่อนลบ
╰┈ ꒰ <a:__:1451387432527335605> 𝒙𝑺𝒘𝒊𝒇𝒕 𝑯𝒖𝒃 ꒱ **`
);

    const btn = new ButtonBuilder()
      .setCustomId("vm_delete")
      .setLabel("ลบห้องเสียง")
      .setEmoji("<a:DG36:1451619653746036910>")
      .setStyle(ButtonStyle.Danger);

    return i.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)],
      ephemeral: true
    });
  }

  /* ---------------- /vstats ---------------- */
  if (i.commandName === "vstats") {
    const active = Object.keys(config.voicePanels).length;

    const rank = Object.values(config.voicePanels).reduce((a, v) => {
      a[v.owner] = (a[v.owner] || 0) + 1;
      return a;
    }, {});

    const top = Object.entries(rank)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((v, i) => `${i + 1}) <@${v[0]}> — ${v[1]} ห้อง`)
      .join("\n") || "ยังไม่มีข้อมูล";

    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 Private Voice Stats")
          .setDescription(`
- ห้องถูกสร้างทั้งหมด: ${config.stats.created}
- ห้องถูกลบทั้งหมด: ${config.stats.deleted}
- กำลังใช้งานอยู่: ${active}

**10 อันดับผู้สร้างห้อง**
${top}
`)
      ],
      ephemeral: true
    });
  }
});

/* =======================================================================================
 * CREATE VOICE BUTTON
 * ======================================================================================= */
client.on("interactionCreate", async i => {
  if (!i.isButton()) return;
  if (i.customId !== "create_voice") return;

  const modal = new ModalBuilder()
    .setCustomId("voice_modal")
    .setTitle("สร้างห้องเสียงส่วนตัว");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("name")
        .setLabel("ชื่อห้อง")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("limit")
        .setLabel("จำกัดคน (0 = ไม่จำกัด)")
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("lock")
        .setLabel("ล็อคห้อง true / false")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
    )
  );

  await i.showModal(modal);
});

/* =======================================================================================
 * MODAL SUBMIT
 * ======================================================================================= */
client.on("interactionCreate", async i => {
  if (!i.isModalSubmit()) return;
  if (i.customId !== "voice_modal") return;

  const name = i.fields.getTextInputValue("name");
  const limitRaw = i.fields.getTextInputValue("limit");
  const lock = i.fields.getTextInputValue("lock") === "true";

  const limit =
    limitRaw === "0"
      ? 0
      : limitRaw
      ? Math.min(99, Math.max(1, Number(limitRaw)))
      : 0;

  config.voicePanels[i.user.id] = {
    owner: i.user.id,
    name,
    limit,
    lock,
    allow: [],
    lastActive: Date.now()
  };
  save();

  const select = new UserSelectMenuBuilder()
    .setCustomId(`allow_${i.user.id}`)
    .setPlaceholder("เลือกเพื่อนที่อนุญาต (หรือข้าม)")
    .setMinValues(0)
    .setMaxValues(10);

  return i.reply({
    content: "เลือกเพื่อน หรือกดข้ามได้เลย",
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true
  });
});

/* =======================================================================================
 * CREATE VOICE CHANNEL (WITH CATEGORY)
 * ======================================================================================= */
client.on("interactionCreate", async i => {
  if (!i.isUserSelectMenu()) return;
  if (!i.customId.startsWith("allow_")) return;

  const data = config.voicePanels[i.user.id];
  data.allow = i.values;

  let category = i.guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === VOICE_CATEGORY_NAME
  );

  if (!category) {
    category = await i.guild.channels.create({
      name: VOICE_CATEGORY_NAME,
      type: ChannelType.GuildCategory
    });
  }

  const perms = [
    {
      id: i.guild.roles.everyone.id,
      deny: data.lock ? ["Connect"] : []
    },
    { id: i.user.id, allow: ["Connect"] }
  ];

  data.allow.forEach(u => perms.push({ id: u, allow: ["Connect"] }));

  const ch = await i.guild.channels.create({
    name: data.name,
    type: ChannelType.GuildVoice,
    parent: category.id,
    userLimit: data.limit === 0 ? null : data.limit,
    permissionOverwrites: perms
  });

  data.channelId = ch.id;
  config.stats.created++;
  save();

  return i.reply({
    content: `🎧 สร้างห้องแล้ว <#${ch.id}>`,
    ephemeral: true
  });
});

/* =======================================================================================
 * VOICE MANAGER DELETE
 * ======================================================================================= */
client.on("interactionCreate", async i => {
  if (!i.isButton()) return;
  if (i.customId !== "vm_delete") return;
  if (i.user.id !== ADMIN_ID) return;

  const rooms = Object.values(config.voicePanels).map(v => ({
    label: v.name,
    value: v.channelId
  }));

  if (rooms.length === 0)
    return i.reply({ content: "❌ ไม่มีห้อง", ephemeral: true });

  const chunks = [];
  while (rooms.length) chunks.push(rooms.splice(0, 25));

  const rows = chunks.map((c, idx) =>
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`vm_select_${idx}`)
        .setMinValues(1)
        .setMaxValues(c.length)
        .addOptions(c)
    )
  );

  return i.reply({
    content: "เลือกห้องที่จะลบ",
    components: rows,
    ephemeral: true
  });
});

/* =======================================================================================
 * CONFIRM DELETE
 * ======================================================================================= */
client.on("interactionCreate", async i => {
  if (!i.isStringSelectMenu()) return;
  if (!i.customId.startsWith("vm_select_")) return;

  const ids = i.values.join(",");

  const yes = new ButtonBuilder()
    .setCustomId(`vm_yes:${ids}`)
    .setLabel("ใช่ ลบเลย")
    .setStyle(ButtonStyle.Danger);

  const no = new ButtonBuilder()
    .setCustomId("vm_no")
    .setLabel("ไม่")
    .setStyle(ButtonStyle.Secondary);

  return i.reply({
    content: "ยืนยันการลบ?",
    components: [new ActionRowBuilder().addComponents(yes, no)],
    ephemeral: true
  });
});

client.on("interactionCreate", async i => {
  if (!i.isButton()) return;

  if (i.customId === "vm_no")
    return i.reply({ content: "❎ ยกเลิก", ephemeral: true });

  if (!i.customId.startsWith("vm_yes:")) return;

  const ids = i.customId.split(":")[1].split(",");
  let del = 0;

  for (const id of ids) {
    const ch = i.guild.channels.cache.get(id);
    if (!ch) continue;
    await ch.delete().catch(() => {});
    del++;

    for (const [u, d] of Object.entries(config.voicePanels))
      if (d.channelId === id) delete config.voicePanels[u];
  }

  config.stats.deleted += del;
  save();

  return i.reply({ content: `🗑️ ลบแล้ว ${del} ห้อง`, ephemeral: true });
});

/* =======================================================================================
 * AUTO DELETE EMPTY VOICE (30 MIN)
 * ======================================================================================= */
setInterval(async () => {
  for (const [u, d] of Object.entries(config.voicePanels)) {
    const ch = client.channels.cache.get(d.channelId);

    if (!ch || (ch.members.size === 0 && Date.now() - d.lastActive > 30 * 60 * 1000)) {
      if (ch) await ch.delete().catch(() => {});
      delete config.voicePanels[u];
      config.stats.deleted++;
      save();
    } else if (ch.members.size > 0) {
      d.lastActive = Date.now();
    }
  }
}, 10_000);

/* =======================================================================================
 * LOGIN
 * ======================================================================================= */
client.login(TOKEN);
