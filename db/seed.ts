import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "flower-kb.db");

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

const db = drizzle(sqlite, { schema });

// 种子数据
async function seed() {
    console.log("🌱 开始填充种子数据...");

    // ⚠️ 警告：避免误删数据
    // 如果需要重置数据库，请手动取消注释或添加 --force 参数（待实现）

    /*
    // 清空现有数据
    sqlite.exec(`
    DELETE FROM plant_tags;
    DELETE FROM care_guides;
    DELETE FROM plants;
    DELETE FROM genera;
    DELETE FROM families;
    DELETE FROM tags;
  `);
  */

    // 确保默认用户存在
    try {
        const adminUser = await db.select().from(schema.users).where(sql`username = 'admin'`).get();
        if (!adminUser) {
            await db.insert(schema.users).values({
                id: crypto.randomUUID(),
                username: "admin",
                displayName: "Administrator",
                role: "admin",
            }).run();
            console.log("✅ Created default admin user");
        }
    } catch (e) {
        console.error("Failed to check/create admin user:", e);
    }

    // 检查是否已有数据
    const existingPlantsCount = db.select({ count: sql<number>`count(*)` }).from(schema.plants).get();
    if (existingPlantsCount && existingPlantsCount.count > 0) {
        console.log("⚠️ 数据库中植物数据已存在，跳过种子数据填充。");
        console.log("   （如需重置，请手动清理数据库或修改 seed 脚本）");
        return;
    }

    // 插入科
    const familiesData = [
        {
            name: "兰科",
            latinName: "Orchidaceae",
            description: "单子叶植物中最大的科之一，以其美丽的花朵著称",
        },
        {
            name: "桑科",
            latinName: "Moraceae",
            description: "包含榕树、无花果等常见植物",
        },
        {
            name: "天南星科",
            latinName: "Araceae",
            description: "热带植物科，包括许多常见的观叶植物",
        },
        {
            name: "景天科",
            latinName: "Crassulaceae",
            description: "多肉植物的代表科，耐旱性强",
        },
        {
            name: "仙人掌科",
            latinName: "Cactaceae",
            description: "原产美洲的多肉植物，适应干旱环境",
        },
    ];

    const insertedFamilies = familiesData.map((f) => {
        return db.insert(schema.families).values(f).returning().get();
    });

    // 插入属
    const generaData = [
        { name: "蝴蝶兰属", latinName: "Phalaenopsis", familyId: insertedFamilies[0].id },
        { name: "石斛属", latinName: "Dendrobium", familyId: insertedFamilies[0].id },
        { name: "榕属", latinName: "Ficus", familyId: insertedFamilies[1].id },
        { name: "绿萝属", latinName: "Epipremnum", familyId: insertedFamilies[2].id },
        { name: "龟背竹属", latinName: "Monstera", familyId: insertedFamilies[2].id },
        { name: "景天属", latinName: "Sedum", familyId: insertedFamilies[3].id },
        { name: "仙人球属", latinName: "Echinopsis", familyId: insertedFamilies[4].id },
    ];

    const insertedGenera = generaData.map((g) => {
        return db.insert(schema.genera).values(g).returning().get();
    });

    // 插入标签
    const tagsData = [
        { name: "观花类", category: "type" as const, color: "#ec4899" },
        { name: "观叶类", category: "type" as const, color: "#22c55e" },
        { name: "多肉类", category: "type" as const, color: "#84cc16" },
        { name: "室内盆栽", category: "scene" as const, color: "#3b82f6" },
        { name: "阳台花园", category: "scene" as const, color: "#f59e0b" },
        { name: "新手友好", category: "feature" as const, color: "#10b981" },
        { name: "净化空气", category: "feature" as const, color: "#06b6d4" },
        { name: "耐阴", category: "feature" as const, color: "#8b5cf6" },
    ];

    const insertedTags = tagsData.map((t) => {
        return db.insert(schema.tags).values(t).returning().get();
    });

    // 插入植物和养护指南
    const plantsWithCare = [
        {
            plant: {
                genusId: insertedGenera[0].id, // 蝴蝶兰属
                name: "蝴蝶兰",
                englishName: "Moth Orchid",
                aliases: "蝶兰,台湾蝴蝶兰",
                latinName: "Phalaenopsis aphrodite",
                imageUrl: "/images/phalaenopsis.jpg",
                difficulty: "medium" as const,
                description: "蝴蝶兰是兰科蝴蝶兰属植物，因花朵形似蝴蝶而得名，是最受欢迎的室内观赏兰花之一。",
            },
            care: {
                soil: "基质必须排水良好，具一定保水性，可采用水苔养殖。",
                temperature: "生长适温为 15-25°C，喜暖畏寒。",
                light: "喜欢柔和光。冬秋春阳光柔和时，可多接受光照。",
                watering: "水苔变干及时浇水，小水漫灌，水苔湿润即好。",
                humidity: "喜欢湿润环境，适宜湿度 50-90% 间，建议经常像叶片喷水。",
                fertilizing: "薄肥勤施。幼株以施氮肥为主，成苗株和花谢后以磷钾肥为主。",
                pestControl: "病害严重枝叶需及时摘除、销毁，若有多株，可隔离暂养。",
                postBloom: "花期结束后，摘除残花的同时，将花梗剪短。",
                propagation: "常用分株法，春季结合换盆进行，也可进行组织培养。",
                notes: "注意通风，避免根部积水腐烂。"
            },
            tags: [0, 3, 5], // 观花类, 室内盆栽
        },
        {
            plant: {
                genusId: insertedGenera[2].id, // 榕属
                name: "琴叶榕",
                englishName: "Fiddle-leaf Fig",
                aliases: "琴叶橡皮树",
                latinName: "Ficus lyrata",
                imageUrl: "/images/ficus-lyrata.jpg",
                difficulty: "medium" as const,
                description: "琴叶榕是桑科榕属常绿乔木，因叶片形似提琴而得名，是极受欢迎的室内大型观叶植物。",
            },
            care: {
                soil: "喜疏松、肥沃且排水良好的微酸性土壤，可用腐叶土混合颗粒土种植。",
                temperature: "生长适温为 25-35°C，耐寒性较弱，冬季需保持在 5°C 以上。",
                light: "喜光照充足，但也耐半阴。夏季需避免烈日暴晒，春秋季节可全日照。",
                watering: "喜湿润，遵循「见干见湿」原则。表土干透后浇透，切忌盆内积水以防烂根。",
                humidity: "喜高湿环境，日常可向叶面喷雾增湿，保持叶片油亮光泽。",
                fertilizing: "生长期每半月施一次稀薄液肥，以氮肥为主，促进叶片宽大翠绿。",
                pestControl: "常见锈斑病和叶斑病，需加强通风，及时清理病叶并喷洒杀菌剂。",
                pruning: "及时修剪顶端嫩芽可促进分枝，保持株型饱满；黄叶、枯叶需随时修剪。",
            },
            tags: [1, 3, 4], // 观叶类, 室内盆栽, 阳台花园
        },
        {
            plant: {
                genusId: insertedGenera[3].id, // 绿萝属
                name: "绿萝",
                englishName: "Devil's Ivy",
                aliases: "黄金葛,魔鬼藤",
                latinName: "Epipremnum aureum",
                imageUrl: "/images/pothos.jpg",
                difficulty: "easy" as const,
                description: "绿萝是天南星科绿萝属植物，生命力顽强，是最容易养护的室内植物之一，具有净化空气的作用。",
            },
            care: {
                soil: "对土壤要求不严，普通营养土即可，也可水培。",
                temperature: "生长适温为 15-30°C，冬季温度不宜低于 10°C。",
                light: "耐阴性强，适合放在室内明亮散射光处，忌强光直射。",
                watering: "保持盆土微润，夏季可多浇水，冬季减少浇水频率。",
                humidity: "喜湿润环境，可经常向叶面喷水，保持叶片翠绿。",
                fertilizing: "生长季每月施一次稀薄液肥，冬季停止施肥。",
                pestControl: "偶有蚧壳虫危害，发现后可用酒精擦拭或喷洒杀虫剂。",
                propagation: "扦插繁殖极易成活，截取带有气生根的茎段即可。",
            },
            tags: [1, 3, 5, 6, 7], // 观叶类, 室内盆栽, 新手友好, 净化空气, 耐阴
        },
        {
            plant: {
                genusId: insertedGenera[4].id, // 龟背竹属
                name: "龟背竹",
                englishName: "Monstera",
                aliases: "蓬莱蕉,电信兰",
                latinName: "Monstera deliciosa",
                imageUrl: "/images/monstera.jpg",
                difficulty: "easy" as const,
                description: "龟背竹是天南星科龟背竹属植物，叶片巨大且有独特的裂孔，是 ins 风格装饰的网红植物。",
            },
            care: {
                soil: "喜疏松肥沃、排水良好的微酸性土壤。",
                temperature: "生长适温为 20-30°C，冬季不低于 5°C。",
                light: "喜半阴环境，忌强光直射，散射光即可满足生长需求。",
                watering: "保持盆土湿润，夏季多浇水并向叶面喷水，冬季控水。",
                humidity: "喜高湿环境，干燥时需向叶片和周围喷水增湿。",
                fertilizing: "生长期每两周施一次稀薄液肥，以氮肥为主。",
                pestControl: "较少病虫害，注意通风防止叶斑病。",
                pruning: "及时修剪老叶、黄叶，保持株型美观。",
            },
            tags: [1, 3, 5, 6, 7], // 观叶类, 室内盆栽, 新手友好, 净化空气, 耐阴
        },
        {
            plant: {
                genusId: insertedGenera[1].id, // 石斛属
                name: "金钗石斛",
                englishName: "Noble Dendrobium",
                aliases: "金钗花,扁草",
                latinName: "Dendrobium nobile",
                imageUrl: "/images/dendrobium.jpg",
                difficulty: "hard" as const,
                description: "金钗石斛是兰科石斛属植物，既是名贵中药材，又是美丽的观赏兰花。",
            },
            care: {
                soil: "使用树皮、水苔、蛇木等透气基质栽培，忌用普通土壤。",
                temperature: "生长适温为 18-28°C，需要明显的昼夜温差促进开花。",
                light: "喜半阴环境，需一定的散射光，忌烈日暴晒。",
                watering: "遵循「干透浇透」原则，保持基质微润但不积水。",
                humidity: "喜高湿环境，湿度保持在 60-80% 为佳。",
                fertilizing: "薄肥勤施，生长期每 10-15 天施一次稀薄兰花专用肥。",
                pestControl: "注意防治蚧壳虫、蜗牛等害虫，保持环境通风。",
                postBloom: "花后适当减少浇水，促进新芽萌发。",
            },
            tags: [0, 3], // 观花类, 室内盆栽
        },
        {
            plant: {
                genusId: insertedGenera[5].id, // 景天属
                name: "玉蝶",
                englishName: "Mexican Hen and Chicks",
                aliases: "石莲花,宝石花",
                latinName: "Echeveria secunda",
                imageUrl: "/images/echeveria.jpg",
                difficulty: "easy" as const,
                description: "玉蝶是景天科拟石莲花属多肉植物，叶片排列紧密如莲花状，是最经典的多肉品种之一。",
            },
            care: {
                soil: "使用疏松透气的颗粒土，可用泥炭与颗粒 3:7 配比。",
                temperature: "生长适温为 15-25°C，夏季需遮阴通风，冬季不低于 5°C。",
                light: "喜充足光照，光照不足会徒长。春秋季可全日照养护。",
                watering: "少量多次，等盆土完全干透后再浇水，夏季控水。",
                humidity: "喜干燥环境，高湿易引发病害，忌叶心积水。",
                fertilizing: "生长季每月施一次稀薄多肉专用肥，夏冬休眠期不施肥。",
                pestControl: "注意防治蚧壳虫，发现后可用酒精棉签擦拭。",
                propagation: "可叶插或砍头繁殖，极易成活。",
            },
            tags: [2, 3, 4, 5], // 多肉类, 室内盆栽, 阳台花园, 新手友好
        },
    ];

    for (const item of plantsWithCare) {
        const insertedPlant = db.insert(schema.plants).values(item.plant).returning().get();

        db.insert(schema.careGuides)
            .values({ ...item.care, plantId: insertedPlant.id })
            .run();

        for (const tagIndex of item.tags) {
            db.insert(schema.plantTags)
                .values({ plantId: insertedPlant.id, tagId: insertedTags[tagIndex].id })
                .run();
        }
    }

    console.log("✅ 种子数据填充完成！");
    console.log(`   - ${familiesData.length} 个科`);
    console.log(`   - ${generaData.length} 个属`);
    console.log(`   - ${plantsWithCare.length} 种植物`);
    console.log(`   - ${tagsData.length} 个标签`);
}

seed().catch(console.error);
