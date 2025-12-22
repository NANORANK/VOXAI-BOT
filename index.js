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
  ChannelType
} from "discord.js";
import { REST } from "@discordjs/rest";
import dotenv from "dotenv";
import fs from "fs-extra";
dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

let config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
const save = () => fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

/* ---------- Slash Commands ---------- */
const commands = [
  new SlashCommandBuilder()
    .setName("privatepanel")
    .setDescription("สร้าง Panel ห้องเสียงส่วนตัว")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("ช่องสำหรับ Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("vstats")
    .setDescription("แสดงสถิติห้องเสียง (Owner)")
].map(c =>
  c.setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON()
);

/* ---------- Ready ---------- */
client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  for (const [gid] of client.guilds.cache) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, gid), {
      body: commands
    });
  }
  console.log("🟢 Bot Online");
});

/* ---------- /privatepanel ---------- */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  if (i.user.id !== ADMIN_ID)
    return i.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  if (i.commandName === "privatepanel") {
    const ch = i.options.getChannel("channel");

    const embed = new EmbedBuilder()
      .setTitle("สร้างห้องเสียงส่วนตัว <a:emoji_27:1449151549602271526>")
      .setDescription(`
** ╭┈ ꒰ <a:3005:1451585834649391144> 𐔌 . ⋮ 𝓑𝔂 𝓩𝓮𝓶𝓸𝓷 Ź𝔁 .ᐟ ָ ₊ ꒱ <a:3007:1451585403751633170> ꒱
> ┃ <a:__:1451387432527335605> • บอทสร้างห้องเสียง 
> ┃ <a:1001:1451585309757149227> • ตั้งชื่อห้อง ล็อคห้อง ได้เลย
> ┃ <a:1002:1451585213560783134> • อนุญาตเพื่อนเข้าได้
> ┃ <a:1004:1451585026935488563> • จำกัดคนเข้าได้มาก 100 คน 
> ┃ <a:emoji_46:1451252945424351310> • บอท ออนไลน์ 24/7 
╰┈ ꒰ <a:__:1451387432527335605> 𐔌 . ⋮ 𝒙𝑺𝒘𝒊𝒇𝒕 𝑯𝒖𝒃 .ᐟ ָ ₊ ꒱ <a:__:1451387432527335605> ꒱ **`
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

  if (i.commandName === "vstats") {
    const active = Object.keys(config.voicePanels).length;

    const ranking = Object.values(config.voicePanels)
      .reduce((a, v) => {
        a[v.owner] = (a[v.owner] || 0) + 1;
        return a;
      }, {});

    const top = Object.entries(ranking)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([u, c], i) => `${i + 1}) <@${u}> — ${c} ห้อง`)
      .join("\n") || "ยังไม่มีข้อมูล";

    const embed = new EmbedBuilder()
      .setTitle("📊 Private Voice Stats")
      .setDescription(`
- ห้องถูกสร้างทั้งหมด: ${config.stats.created}
- ห้องถูกลบทั้งหมด: ${config.stats.deleted}
- กำลังใช้งานอยู่: ${active}

**10 อันดับผู้สร้างห้อง**
${top}
`);

    return i.reply({ embeds: [embed], ephemeral: true });
  }
});

/* ---------- Create Voice ---------- */
client.on("interactionCreate", async i => {
  if (!i.isButton()) return;
  if (i.customId !== "create_voice") return;

  const modal = new ModalBuilder()
    .setCustomId("voice_modal")
    .setTitle("สร้างห้องส่วนตัว");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("name")
        .setLabel("ชื่อห้อง")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("limit")
        .setLabel("จำกัดคน (1-99 หรือเว้นว่าง)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    )
  );

  await i.showModal(modal);
});

/* ---------- Modal Submit ---------- */
client.on("interactionCreate", async i => {
  if (!i.isModalSubmit()) return;
  if (i.customId !== "voice_modal") return;

  const name = i.fields.getTextInputValue("name");
  const limitRaw = i.fields.getTextInputValue("limit");
  const limit = limitRaw ? Math.min(99, Math.max(1, Number(limitRaw))) : null;

  const select = new UserSelectMenuBuilder()
    .setCustomId(`allow_${i.user.id}`)
    .setPlaceholder("เลือกเพื่อนที่อนุญาตเข้าได้")
    .setMinValues(0)
    .setMaxValues(10);

  config.voicePanels[i.user.id] = {
    owner: i.user.id,
    name,
    limit,
    allow: [],
    lastActive: Date.now()
  };
  save();

  return i.reply({
    content: "เลือกเพื่อน (หรือข้าม)",
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true
  });
});

/* ---------- Create Channel ---------- */
client.on("interactionCreate", async i => {
  if (!i.isUserSelectMenu()) return;
  if (!i.customId.startsWith("allow_")) return;

  const data = config.voicePanels[i.user.id];
  data.allow = i.values;

  const perms = [
    { id: i.guild.roles.everyone.id, deny: ["Connect"] },
    { id: i.user.id, allow: ["Connect"] }
  ];
  data.allow.forEach(u =>
    perms.push({ id: u, allow: ["Connect"] })
  );

  const ch = await i.guild.channels.create({
    name: data.name,
    type: ChannelType.GuildVoice,
    userLimit: data.limit || null,
    permissionOverwrites: perms
  });

  data.channelId = ch.id;
  config.stats.created++;
  save();

  return i.reply({ content: `🎧 สร้างห้องแล้ว <#${ch.id}>`, ephemeral: true });
});

/* ---------- Auto Delete ---------- */
setInterval(async () => {
  for (const [u, d] of Object.entries(config.voicePanels)) {
    const ch = client.channels.cache.get(d.channelId);
    if (!ch || ch.members.size === 0 && Date.now() - d.lastActive > 30 * 60 * 1000) {
      if (ch) await ch.delete().catch(() => {});
      delete config.voicePanels[u];
      config.stats.deleted++;
      save();
    } else if (ch.members.size > 0) {
      d.lastActive = Date.now();
      save();
    }
  }
}, 10_000);

client.login(TOKEN);
