// index.js
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
  ChannelType,
  StringSelectMenuBuilder
} from "discord.js";
import { REST } from "@discordjs/rest";
import dotenv from "dotenv";
import fs from "fs-extra";
dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

let config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const save = () =>
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

// ===== Slash Commands =====
const commands = [
  new SlashCommandBuilder()
    .setName("privatepanel")
    .setDescription("สร้าง Panel ห้องเสียงส่วนตัว")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("ช่องที่จะวาง Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("voicemanager")
    .setDescription("จัดการลบห้องเสียง (Owner)"),

  new SlashCommandBuilder()
    .setName("vstats")
    .setDescription("ดูสถิติ Private Voice")
]
  .map(c =>
    c.setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON()
  );

// ===== Ready =====
client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  for (const [gid] of client.guilds.cache)
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, gid),
      { body: commands }
    );
});

// ===== /privatepanel =====
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName !== "privatepanel") return;
  if (i.user.id !== ADMIN_ID)
    return i.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  const ch = i.options.getChannel("channel");

  const embed = new EmbedBuilder()
    .setTitle(`สร้างห้องเสียงส่วนตัว <a:emoji_27:1449151549602271526>`)
    .setDescription(`
** ╭┈ ꒰ <a:3005:1451585834649391144> 𐔌 . ⋮ 𝓑𝔂 𝓩𝓮𝓶𝓸𝓷 Ź𝔁 .ᐟ ָ ₊ ꒱ <a:3007:1451585403751633170> ꒱
> ┃ <a:__:1451387432527335605> • บอทสร้างห้องเสียง 
> ┃ <a:1001:1451585309757149227> • ตั้งชื่อ / ล็อค / จำกัดคน
> ┃ <a:1004:1451585026935488563> • ลบอัตโนมัติเมื่อว่าง
> ┃ <a:emoji_46:1451252945424351310> • ออนไลน์ 24/7
╰┈ ꒰ <a:__:1451387432527335605> 𝒙𝑺𝒘𝒊𝒇𝒕 𝑯𝒖𝒃 ꒱ **`);

  const btn = new ButtonBuilder()
    .setCustomId("pv_create")
    .setLabel("สร้างห้อง")
    .setEmoji("<a:DG36:1451619653746036910>")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(btn);
  const msg = await ch.send({ embeds: [embed], components: [row] });

  config.panelChannelId = ch.id;
  config.panelMessageId = msg.id;
  save();

  i.reply({ content: "🟢 สร้าง Panel แล้ว", ephemeral: true });
});

// ===== Create Voice Button =====
client.on("interactionCreate", async i => {
  if (!i.isButton()) return;
  if (i.customId !== "pv_create") return;

  const modal = new ModalBuilder()
    .setCustomId("pv_modal")
    .setTitle("ตั้งค่าห้องเสียง");

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
        .setLabel("จำกัดคน (1-99 หรือเว้นว่าง)")
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
    )
  );

  i.showModal(modal);
});

// ===== Modal Submit =====
client.on("interactionCreate", async i => {
  if (!i.isModalSubmit()) return;
  if (i.customId !== "pv_modal") return;

  const name = i.fields.getTextInputValue("name");
  const limitRaw = i.fields.getTextInputValue("limit");
  const limit =
    limitRaw && !isNaN(limitRaw)
      ? Math.max(1, Math.min(99, Number(limitRaw)))
      : null;

  const guild = i.guild;

  const vc = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    userLimit: limit,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: ["Connect"] },
      { id: i.user.id, allow: ["Connect", "Speak"] }
    ]
  });

  config.stats.created++;
  config.stats.perUser[i.user.id] =
    (config.stats.perUser[i.user.id] || 0) + 1;

  config.voicePanels[i.user.id] = {
    channelId: vc.id,
    lastActive: Date.now()
  };

  save();

  i.reply({ content: `🎧 สร้างแล้ว → <#${vc.id}>`, ephemeral: true });
});

// ===== Auto Delete =====
setInterval(async () => {
  for (const [uid, data] of Object.entries(config.voicePanels)) {
    const ch = client.channels.cache.get(data.channelId);
    if (!ch) {
      delete config.voicePanels[uid];
      save();
      continue;
    }

    if (ch.members.size === 0) {
      if (Date.now() - data.lastActive > 30 * 60 * 1000) {
        await ch.delete().catch(() => {});
        delete config.voicePanels[uid];
        config.stats.deleted++;
        save();
      }
    } else {
      data.lastActive = Date.now();
      save();
    }
  }
}, 10_000);

// ===== /vstats =====
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName !== "vstats") return;

  const active = Object.keys(config.voicePanels).length;

  const top = Object.entries(config.stats.perUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(
      ([u, c], idx) => `${idx + 1}) <@${u}> — ${c} ห้อง`
    )
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("📊 Private Voice Stats")
    .setDescription(`
- ห้องถูกสร้างทั้งหมด: ${config.stats.created}
- ห้องถูกลบทั้งหมด: ${config.stats.deleted}
- กำลังใช้งานอยู่: ${active}

**10 อันดับผู้สร้างห้อง**
${top || "ยังไม่มีข้อมูล"}
`);

  i.reply({ embeds: [embed], ephemeral: true });
});

client.login(TOKEN);
