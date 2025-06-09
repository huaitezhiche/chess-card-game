// 游戏状态全局变量（新增选中卡牌字段）
const GAME_STATE = {
    currentPlayer: 'black', // 当前玩家（black/white）
    isRobot: { black: false, white: true }, // 白方设为机器人
    remainingTurns: 60, // 修改：总回合数调整为60（每方30回合）
    players: { // 玩家数据
        black: { hand: [], board: {}, character: null, score: 0, disconnectedAreas: [], usedSkills: { shiYue: false, zhenXu: false, bianXiangYi: 0 } }, // 新增断开区域数组及技能使用状态
    white: { hand: [], board: {}, character: null, score: 0, disconnectedAreas: [], usedSkills: { shiYue: false, zhenXu: false, bianXiangYi: 0 } }  // 新增断开区域数组及技能使用状态
    },
    deck: [], // 牌堆
    connectedAreas: [], // 存储结构改为 [{ areas: ['left1','left2'], owner: 'black' }, ...]
    techniqueTrackers: {  // 新增：初始化手筋牌追踪器
    discFour: [],       // 盘角曲四追踪数组（存储触发条件）
    invertedBoot: [],   // 倒脱靴追踪数组（存储结构：{ sourcePlayer: 'black', position: 'mid', triggered: false }
    goldenRooster: [],  // 新增：金鸡独立追踪数组（存储结构：{ sourcePlayer: 'black', position: 'mid', triggered: false }）
    yellowWarbler: []   // 新增：黄莺扑蝶追踪数组（存储结构：{ position: 'gap1', sourcePlayer: 'black' }
    }
};

// 初始化牌堆（合并并修正数量）
function initDeck() {
    // 招法牌（使用Array.from创建独立对象）
    const moveCards = [
        ...Array.from({ length: 16 }, () => ({ 
            type: 'move', 
            name: '长', 
            effect: '气+3',
            image: './src/img/长.png'  // 新增图片路径
        })),
        ...Array.from({ length: 16 }, () => ({ 
            type: 'move', 
            name: '围', 
            effect: '目+5',
            image: './src/img/围.png'  // 新增图片路径
        })),
        ...Array.from({ length: 4 }, () => ({ 
            type: 'move', 
            name: '接', 
            effect: '连接相邻区域',
            image: './src/img/接.png'  // 新增图片路径
        })),
        ...Array.from({ length: 4 }, () => ({ 
            type: 'move', 
            name: '断', 
            effect: '禁止对手连接',
            image: './src/img/断.png'  // 新增图片路径
        })),
        ...Array.from({ length: 6 }, () => ({ 
            type: 'move', 
            name: '提', 
            effect: '提掉对手棋子',
            image: './src/img/提.png'  // 新增图片路径
        })),
        ...Array.from({ length: 6 }, () => ({ 
            type: 'move', 
            name: '做眼', 
            effect: '目+1（2张免疫提）',
            image: './src/img/做眼.png'  // 新增图片路径
        })),
    ];

    // 手筋牌（使用Array.from创建独立对象）
    const techniqueCards = [
        { type: 'technique', name: '金鸡独立', effect: '提牌时气+1', image: './src/img/金鸡独立.png' },
        { type: 'technique', name: '倒脱靴', effect: '被提时获得目', image: './src/img/倒脱靴.png' },
        { type: 'technique', name: '黄莺扑蝶', effect: '目-2，提牌时气+3', image: './src/img/黄莺扑蝶.png' },
        { type: 'technique', name: '盘角曲四', effect: '对手4卡时提掉', image: './src/img/盘角曲四.png' }
    ];
    const doubledTechniqueCards = [...techniqueCards.map(c => ({...c})), ...techniqueCards.map(c => ({...c}))]; // 深拷贝避免引用

    GAME_STATE.deck = [...moveCards, ...doubledTechniqueCards];
    shuffleDeck(GAME_STATE.deck); 
}

// 删除原第55-73行重复的initDeck函数（关键修复）
// 新增：棋子牌定义（根据规则，初始5张棋子牌）
// 修复后（每个卡牌独立对象）
// 原初始化手牌（若stoneCards通过fill创建，可能引用重复）
const stoneCards = Array.from({ length: 5 }, () => ({ 
    type: 'stone', 
    name: '棋子', 
    effect: '基础棋子（气=4）',
    image: './src/img/棋子.png' // 图片路径（根据实际存放位置调整）
})); // 已使用Array.from创建独立对象，无需修改

// 直接展开即可（已为独立对象）
function drawInitialHands() {
    GAME_STATE.players.black.hand = [...stoneCards]; // 展开数组，每个元素是独立对象
    GAME_STATE.players.white.hand = [...stoneCards];
}


// 初始化角色卡选择（9选3）
function initCharacterSelection() {
    const characters = [
        { 
            name: '古力', 
            skill: '你的每个区域的棋子牌“气”加1（与招法牌、手筋牌效果累加）',
            image: './src/img/characters/古力.png' // 新增图片路径
        },
        { 
            name: '李世石', 
            skill: '你的卡牌被移除后（包括被提掉、触发手筋牌移出等），将直接回到手牌（不占用抽牌次数）',
            image: './src/img/characters/李世石.png' // 新增图片路径
        },
        { 
            name: '时越', 
            skill: '每局游戏限1次，你可以查看剩余牌堆，并将牌堆中的1张“提”牌置入手牌（若牌堆无“提”牌则无法发动）',
            image: './src/img/characters/时越.png' // 新增图片路径
        },
        { 
            name: '范廷钰', 
            skill: '你每个区域的棋子牌仅需1张“做眼”牌即可永久无法被提掉（原规则需2张）',
            image: './src/img/characters/范廷钰.png' // 新增图片路径
        },
        { 
            name: '陈耀烨', 
            skill: '你位于左2路、右2路（2线区域）的卡牌“目”数乘以2（与其他倍率叠加计算）',
            image: './src/img/characters/陈耀烨.png' // 新增图片路径
        },
        { 
            name: '申真谞', 
            skill: '每局游戏限1次，你可以将对手任意1张背面朝上的手筋牌翻面（暴露其类型）',
            image: './src/img/characters/申真谞.png' // 新增图片路径
        },
        { 
            name: '柯洁', 
            skill: '你手筋牌的效果翻倍',
            image: './src/img/characters/柯洁.png' // 新增图片路径
        },
        { 
            name: '卞相一', 
            skill: '每局游戏限2次，你可以查看对手的手牌：若对手手牌未按“棋子牌→招法牌→手筋牌”顺序摆放，第一次触发时你“目”数加2；第二次触发时直接获胜（无论当前目数）',
            image: './src/img/characters/卞相一.png' // 新增图片路径
        },
        { 
        name: '党毅飞', 
        skill: '你的每个包含至少1张「围」牌的区域，该区域的「目」数额外加2（与其他目数加成叠加）', // 修改后的技能描述
        image: './src/img/characters/党毅飞.png' // 新增图片路径
    },
    // 新增杨鼎新角色
    { 
        name: '杨鼎新', 
        skill: '当剩余回合数为20时，如果你在自己每个区域（左1路、左2路、3路、右2路、右1路）都有棋子牌，直接获胜（无论当前目数）',
        image: './src/img/characters/杨鼎新.png' // 需准备对应图片
    }
    ];
    const selected = shuffleArray(characters).slice(0, 3); // 随机选3张
    const container = document.getElementById('character-cards');
    container.innerHTML = ''; // 关键新增：清空原有内容，避免重复渲染
    selected.forEach(char => {
        const card = document.createElement('div');
        card.className = 'card character-card';
        card.innerHTML = `
            <img src="${char.image}" alt="${char.name}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
            <div style="height:30%; padding-top:4px; font-size:12px; text-align:center;">
                <strong>${char.name}</strong><br>
                ${char.skill}
            </div>
        `;
        card.onclick = () => selectCharacter(char);
        container.appendChild(card);
    });
    document.getElementById('character-modal').style.display = 'flex';
}

// 选择角色卡后开始游戏
function selectCharacter(char) {
    GAME_STATE.players[GAME_STATE.currentPlayer].character = char; // 关键赋值
    document.getElementById('character-modal').style.display = 'none';
    startGame();
}

// 游戏启动
function startGame() {
    initDeck();
    drawInitialHands(); // 初始发5张棋子牌（简化示例，实际需补充棋子牌定义）
    renderHandCards();
}

// 渲染手牌（修改点击事件）
// 渲染当前玩家手牌（保持原有详细显示）
function renderHandCards() {
    const container = document.querySelector('#hand-cards .card-container');
    container.innerHTML = '';
    GAME_STATE.players[GAME_STATE.currentPlayer].hand.forEach(card => {
        const cardElem = document.createElement('div');
        cardElem.className = `card ${card.type}`;
        // 使用图片替换文本内容（保留名称作为alt）
        // 原有手牌渲染代码
        cardElem.innerHTML = `
            <img src="${card.image}" alt="${card.name}" style="width:100%; height:80%; object-fit:contain;">
            <div style="font-size:12px; text-align:center;">${card.name}</div>
        `;
        
        // 修改后（移除文字区域）
        cardElem.innerHTML = `
            <img src="${card.image}" alt="${card.name}" style="width:100%; height:100%; object-fit:cover;">
        `;
        cardElem.onclick = () => {
            GAME_STATE.selectedCard = card;
            highlightAvailableAreas();
        };
        container.appendChild(cardElem);
    });

    // 绑定'时越'技能按钮点击事件
    document.getElementById('shiyue-skill-btn').onclick = activateShiyueSkill;
    document.getElementById('zhenxu-skill-btn').onclick = activateZhenXuSkill; // 新增
    document.getElementById('bianxiangyi-skill-btn').onclick = activateBianXiangYiSkill; // 新增
}
// 新增：渲染对手手牌（仅显示数量）
function renderOpponentHand() {
    const opponent = GAME_STATE.currentPlayer === 'black' ? 'white' : 'black';
    const opponentHand = GAME_STATE.players[opponent].hand;
    const container = document.querySelector('.opponent-card-container');
    
    // 渲染为背面朝上的卡片图片（隐藏文字）
    container.innerHTML = `
        <div class="opponent-card"></div> <!-- 仅保留卡片容器 -->
        <div class="opponent-info">手牌：${opponentHand.length}张 | 手筋牌：${opponentHand.filter(c => c.type === 'technique').length}张</div>
    `;
}


// 工具函数：洗牌
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 新增：补充shuffleArray函数（原shuffleDeck可复用）
function shuffleArray(arr) {
    // 直接复用已有的洗牌逻辑
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


// 出牌后切换玩家（修改回合切换逻辑）
// 修改玩家切换逻辑（增加回合结束判断）
function switchPlayer() {
    // 检查是否所有回合已结束
    if (GAME_STATE.remainingTurns <= 0) {
        endGame();
        return;
    }

    // 正常切换玩家
    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer === 'black' ? 'white' : 'black';
    document.getElementById('current-player').textContent = GAME_STATE.currentPlayer === 'black' ? '黑方' : '白方';

    // 关键新增：切换玩家后强制渲染牌桌（确保状态更新）
    renderBoard();

    // 机器人回合自动出牌（移除延迟）
    if (GAME_STATE.isRobot[GAME_STATE.currentPlayer]) {
        robotPlay(); // 直接调用，无需setTimeout延迟
    }
}

// 新增：机器人自动出牌逻辑
// 新增：获取当前玩家所有可放置的空区域
function getAvailableAreas(player) {
    const areas = [];
    const positions = ['left1', 'left2', 'mid', 'right2', 'right1'];
    positions.forEach(pos => {
        if (!GAME_STATE.players[player].board[pos]) {
            areas.push(pos);
        }
    });
    return areas;
}

// 修改机器人出牌逻辑（根据卡牌类型选择目标区域）
// 修改机器人出牌逻辑中的可放置区域判断（添加断/接牌区域限制）
function robotPlay() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const opponent = currentPlayer === 'black' ? 'white' : 'black';
    const currentHand = GAME_STATE.players[currentPlayer].hand;
    if (currentHand.length === 0 || GAME_STATE.remainingTurns <= 0) return;

    // 1. 随机选择一张手牌
    const randomCardIndex = Math.floor(Math.random() * currentHand.length);
    const selectedCard = currentHand[randomCardIndex];

    const targetPlayer = selectedCard.name === '断' ? opponent : currentPlayer;
    const availableAreas = [];
    const gapPositions = ['gap1', 'gap2', 'gap3', 'gap4'];
    const gapAdjacentAreas = { // 与highlightAvailableAreas保持一致的映射
        gap1: ['left1', 'left2'],
        gap2: ['left2', 'mid'],
        gap3: ['mid', 'right2'],
        gap4: ['right2', 'right1']
    };
    const positions = ['left1', 'gap1', 'left2', 'gap2', 'mid', 'gap3', 'right2', 'gap4', 'right1']; 
    
    positions.forEach(pos => {
        const currentAreaCards = GAME_STATE.players[targetPlayer].board[pos] || [];
        const hasStoneCard = currentAreaCards.some(c => c.card.type === 'stone');
        const hasDisconnectOrConnect = currentAreaCards.some(c => ['断', '接'].includes(c.card.name));
        const isGapArea = gapPositions.includes(pos); // 判断是否为间隔区域

        let canPlace;
        // 断牌放置条件（不变）
        if (selectedCard.name === '断') {
            canPlace = isGapArea && !hasDisconnectOrConnect;
        }
        // 接牌放置条件（不变）
        else if (selectedCard.name === '接') {
            const adjacentAreas = gapAdjacentAreas[pos];
            const hasAdjacentStones = adjacentAreas?.every(adjPos => {
                const adjAreaCards = GAME_STATE.players[targetPlayer].board[adjPos] || [];
                return adjAreaCards.some(c => c.card.type === 'stone');
            }) || false;
            canPlace = isGapArea && !hasDisconnectOrConnect && hasAdjacentStones;
        }
        // 长、围等move类型卡牌（关键调整）
        else if (selectedCard.type === 'move') {
            // 允许非间隔区域，且：
            // - 若为棋子牌（stone）：区域无棋子
            // - 若为move牌（长、围等）：区域有棋子（移除无棋子时的放置权限）
            canPlace = !isGapArea && (
                selectedCard.type === 'stone' 
                    ? !hasStoneCard 
                    : hasStoneCard // 修正：仅允许有棋子牌的区域放置招法牌
            );
        }
        // 其他类型卡牌（不变）
        else {
            canPlace = !isGapArea && (selectedCard.type === 'stone' 
                ? !hasStoneCard 
                : hasStoneCard);
        }

        if (canPlace) {
            availableAreas.push(pos);
        }
    });

    if (availableAreas.length === 0) {
        console.log('无符合条件的区域，机器人跳过回合');
        switchPlayer(); 
        return;
    }

    // 3. 随机选择一个可放置的区域
    const randomAreaIndex = Math.floor(Math.random() * availableAreas.length);
    const selectedArea = availableAreas[randomAreaIndex];

    // 4. 模拟选牌→选区域→放置（传递目标玩家）
    GAME_STATE.selectedCard = selectedCard; 
    placeCard(selectedArea, targetPlayer); 
}



// 初始化调用
initCharacterSelection();

// 高亮可放置的区域（调整目标区域逻辑）
function highlightAvailableAreas() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const opponent = currentPlayer === 'black' ? 'white' : 'black';
    const targetPlayer = ['断', '提'].includes(GAME_STATE.selectedCard.name) ? opponent : currentPlayer;
    const gapPositions = ['gap1', 'gap2', 'gap3', 'gap4']; 
    const gapAdjacentAreas = {
        gap1: ['left1', 'left2'],
        gap2: ['left2', 'mid'],
        gap3: ['mid', 'right2'],
        gap4: ['right2', 'right1']
    };
    
    const targetAreas = document.querySelectorAll(`.player-area[data-player="${targetPlayer}"] .area`);
    
    targetAreas.forEach(area => {
        const position = area.dataset.position;
        const currentAreaCards = GAME_STATE.players[targetPlayer].board[position] || [];
        const hasStoneCard = currentAreaCards.some(c => c.card.type === 'stone');
        const hasDisconnectOrConnect = currentAreaCards.some(c => ['断', '接'].includes(c.card.name));
        const isGapArea = gapPositions.includes(position);
        
        let canPlace;
        if (GAME_STATE.selectedCard.name === '断') {
            canPlace = isGapArea && !hasDisconnectOrConnect;
        } else if (GAME_STATE.selectedCard.name === '接') {
            if (isGapArea) {
                const adjacentAreas = gapAdjacentAreas[position];
            if (!adjacentAreas) {
                canPlace = false;
                return;
            }
            const hasAdjacentStones = adjacentAreas.every(adjPos => {
                    const adjAreaCards = GAME_STATE.players[currentPlayer].board[adjPos] || []; // 修改为currentPlayer
                    return adjAreaCards.some(c => c.card.type === 'stone');
                });

            // 关键修正：明确黄莺扑蝶的来源是当前玩家（自己），且接牌玩家是对手
            const isYellowWarblerBlock = GAME_STATE.techniqueTrackers.yellowWarbler.some(tracker => 
                tracker.position === position && 
                tracker.sourcePlayer === currentPlayer && // 黄莺扑蝶由当前玩家（自己）放置
                targetPlayer === opponent // 接牌玩家是对手（即对手在尝试连接）
            );

            // 关键新增：检查相邻区域是否已被当前玩家连接（避免重复连接）
            const isAlreadyConnected = GAME_STATE.connectedAreas.some(connect => 
                connect.owner === currentPlayer && // 仅检查当前玩家的连接
                connect.areas.includes(position)
            );

            canPlace = !hasDisconnectOrConnect && hasAdjacentStones && !isYellowWarblerBlock && !isAlreadyConnected; 
            } else {
                canPlace = false;
            }
        } else if (GAME_STATE.selectedCard.name === '提') {
            const targetAreaCards = GAME_STATE.players[targetPlayer].board[position] || [];
            const hasStones = targetAreaCards.some(c => c.card.type === 'stone');
            const eyeCardsCount = targetAreaCards.filter(c => c.card.type === 'move' && c.card.name === '做眼').length;

            // 计算当前玩家和对手区域的气值（与placeCard逻辑一致，不包含金鸡独立加成）
            const selfAreaCards = GAME_STATE.players[currentPlayer].board[position] || [];
            const selfStones = selfAreaCards.filter(c => c.card.type === 'stone');
            const selfQi = selfStones.reduce((sum, stone) => {
    const isGuLi = GAME_STATE.players[currentPlayer].character?.name === '古力';
    // 检查当前区域是否有未触发的金鸡独立手筋牌
    const hasGoldenRooster = GAME_STATE.techniqueTrackers.goldenRooster.some(tracker => 
        tracker.position === position && 
        tracker.sourcePlayer === currentPlayer && 
        !tracker.triggered
    );
    let baseQi = stone.qi + (isGuLi ? 1 : 0); // 基础气值 + 古力加成
    const isKejie = GAME_STATE.players[opponent].character?.name === '柯洁'; // 柯洁技能判断
        const goldenRoosterMultiplier = hasGoldenRooster ? (isKejie ? 4 : 2) : 1;
        return sum + (baseQi * goldenRoosterMultiplier); // 金鸡独立时气值×2（普通）或×4（柯洁）
}, 0);

            const opponentAreaCards = GAME_STATE.players[opponent].board[position] || [];
            const opponentStones = opponentAreaCards.filter(c => c.card.type === 'stone');
            const opponentQi = opponentStones.reduce((sum, stone) => {
    const isGuLi = GAME_STATE.players[opponent].character?.name === '古力';
    // 检查对手区域是否有未触发的金鸡独立手筋牌
    const hasGoldenRooster = GAME_STATE.techniqueTrackers.goldenRooster.some(tracker => 
        tracker.position === position && 
        tracker.sourcePlayer === opponent && 
        !tracker.triggered
    );
    let baseQi = stone.qi + (isGuLi ? 1 : 0); // 基础气值 + 古力加成
    const isKejie = GAME_STATE.players[opponent].character?.name === '柯洁'; // 柯洁技能判断
        const goldenRoosterMultiplier = hasGoldenRooster ? (isKejie ? 4 : 2) : 1;
        return sum + (baseQi * goldenRoosterMultiplier); // 金鸡独立时气值×2（普通）或×4（柯洁）
}, 0);

            // 提牌可用条件：有棋子、做眼牌<2、当前玩家气值>对手气值
            canPlace = hasStones && eyeCardsCount < 2 && selfQi > opponentQi;
        } else {
            canPlace = !isGapArea && (GAME_STATE.selectedCard.type === 'stone' 
                ? !hasStoneCard 
                : hasStoneCard);
        }
        
        if (canPlace) { 
            area.style.borderColor = '#00ff00';
            area.onclick = () => placeCard(position, targetPlayer);
        } else {
            area.style.borderColor = '';
        }
    });

    // 绑定'时越'技能按钮点击事件
    document.getElementById('shiyue-skill-btn').onclick = activateShiyueSkill;
    document.getElementById('zhenxu-skill-btn').onclick = activateZhenXuSkill; // 新增
    document.getElementById('bianxiangyi-skill-btn').onclick = activateBianXiangYiSkill; // 新增
}
// 新增：渲染牌桌区域（强化状态持续显示）
function renderBoard() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const opponent = currentPlayer === 'black' ? 'white' : 'black'; 
    const gapPositions = ['gap1', 'gap2', 'gap3', 'gap4']; 
    // 新增：区域倍率配置（left1/right1=1，left2/right2=2，mid=3）
    const areaMultipliers = {
        left1: 1,
        right1: 1,
        left2: 2,
        right2: 2,
        mid: 3
    }; 

    // 渲染当前玩家区域
    // 渲染当前玩家区域
    const currentPlayerAreas = document.querySelectorAll(`.player-area[data-player="${currentPlayer}"] .area`);
    currentPlayerAreas.forEach(area => {
        const position = area.dataset.position;
        const isGapArea = gapPositions.includes(position); 

        if (isGapArea) {
            // 获取当前区域的卡牌（判断是否已放置断/接牌）
            const currentAreaCards = GAME_STATE.players[currentPlayer].board[position] || [];
            const hasDisconnectOrConnect = currentAreaCards.some(c => ['断', '接'].includes(c.card.name));
            
            if (!hasDisconnectOrConnect) {
                // 未放置牌时显示“断接区”
                area.innerHTML = '断接区';
                return;
            }

            // 已放置牌时显示连接/断开状态
            const isDisconnected = GAME_STATE.players[opponent].disconnectedAreas.includes(position);
            const statusText = isDisconnected 
                ? `<span style="color:red">已断开</span>` 
                : `<span style="color:green">已连接</span>`;
            area.innerHTML = statusText; 
            return; 
        }

        // ... 其他区域渲染逻辑保持不变 ...
    });

    // 渲染对手区域（同步修改）
    // 渲染对手区域（同步修改）
    const opponentAreas = document.querySelectorAll(`.player-area[data-player="${opponent}"] .area`);
    opponentAreas.forEach(area => {
        const position = area.dataset.position;
        const isGapArea = gapPositions.includes(position);

        if (isGapArea) {
            // 获取当前区域的卡牌（判断是否已放置断/接牌）
            const currentAreaCards = GAME_STATE.players[opponent].board[position] || [];
            const hasDisconnectOrConnect = currentAreaCards.some(c => ['断', '接'].includes(c.card.name));
            
            if (!hasDisconnectOrConnect) {
                // 未放置牌时显示“断接区”
                area.innerHTML = '断接区';
                return;
            }

            // 已放置牌时显示连接/断开状态
            const isDisconnected = GAME_STATE.players[currentPlayer].disconnectedAreas.includes(position);
            const statusText = isDisconnected 
                ? `<span style="color:red">已断开</span>` 
                : `<span style="color:green">已连接</span>`;
            area.innerHTML = statusText; 
            return; 
        }

        // 对手区域气和目计算（与当前玩家区域一致）
        const areaCards = GAME_STATE.players[opponent].board[position] || [];
        const stoneCards = areaCards.filter(c => c.card.type === 'stone');
        // 新增：检查当前区域是否有未触发的金鸡独立牌
        const hasGoldenRooster = GAME_STATE.techniqueTrackers.goldenRooster.some(tracker => 
            tracker.position === position && !tracker.triggered
        );
        // 新增：古力技能判断（对手是否选择古力）
const isGuLi = GAME_STATE.players[opponent].character?.name === '古力';
// 气值计算时累加技能效果
const stoneQi = stoneCards.reduce((sum, c) => {
            return sum + c.qi + (isGuLi ? 1 : 0); // 仅基础气值+古力加成，移除金鸡独立翻倍
        }, 0); 
        const moveCards = areaCards.filter(c => c.card.type === 'move');
        
        // 分开计算围牌和做眼牌的目数（关键修改）
        const surroundCount = moveCards.filter(c => c.card.name === '围').length;
        const eyeCount = moveCards.filter(c => c.card.name === '做眼').length;
        const surroundScore = surroundCount * 5; // 围牌目数（未乘倍率）
        const eyeScore = eyeCount * 1; // 做眼牌目数（不乘倍率）
        
        // 仅对围牌目数应用区域倍率
        const multiplier = areaMultipliers[position] || 1;
        const surroundScoreWithMultiplier = surroundScore * multiplier; 
            let moveScoreWithMultiplier = surroundScoreWithMultiplier + eyeScore; // 总目数=围（带倍率）+做眼（不带）

            // 新增：党毅飞技能判断（对手是否选择党毅飞且有围牌）
            const opponentCharacter = GAME_STATE.players[opponent].character?.name;
            if (opponentCharacter === '党毅飞' && surroundCount > 0) {
                moveScoreWithMultiplier += 2; // 目数额外加2
            }

            // 新增：陈耀烨技能判断（左2/右2区域目数×2）
            const opponentIsChenYaoye = opponentCharacter === '陈耀烨';  // 重命名变量避免重复声明
            const opponentIs2ndLine = ['left2', 'right2'].includes(position);  // 重命名变量避免重复声明
            if (opponentIsChenYaoye && opponentIs2ndLine) {
                moveScoreWithMultiplier *= 2; // 目数乘以2
            }

            // 新增：党毅飞技能判断（当前玩家是否选择党毅飞且有围牌）
            const currentCharacter = GAME_STATE.players[currentPlayer].character?.name;
            if (currentCharacter === '党毅飞' && surroundCount > 0) {
                moveScoreWithMultiplier += 2; // 目数额外加2
            }

            // 新增：陈耀烨技能判断（左2/右2区域目数×2）
            const currentIsChenYaoye = currentCharacter === '陈耀烨';  // 重命名变量避免重复声明
            const currentIs2ndLine = ['left2', 'right2'].includes(position);  // 重命名变量避免重复声明
            if (currentIsChenYaoye && currentIs2ndLine) {
                moveScoreWithMultiplier *= 2; // 目数乘以2
            }
        
        const eyeCardsCount = eyeCount; 
        const techniqueCount = areaCards.filter(c => c.card.type === 'technique').length; 
        
        // 合并所有信息到同一个areaInfo数组（避免重复声明）
        const areaInfo = [
            stoneQi > 0 ? `气：${stoneQi}` : (stoneCards.length > 0 ? `气：0` : ''),
            moveScoreWithMultiplier > 0 ? `目：${moveScoreWithMultiplier}` : (moveCards.length > 0 ? `目：0` : ''), 
            eyeCardsCount > 0 ? `眼：${eyeCardsCount}个` : '',
            techniqueCount > 0 ? `手筋：${techniqueCount}张` : '' 
        ].filter(item => item !== ''); 
        
        area.innerHTML = areaInfo.join('<br>') || position; 
    });

    // 绑定'时越'技能按钮点击事件
    document.getElementById('shiyue-skill-btn').onclick = activateShiyueSkill;
    document.getElementById('zhenxu-skill-btn').onclick = activateZhenXuSkill; // 新增
    document.getElementById('bianxiangyi-skill-btn').onclick = activateBianXiangYiSkill; // 新增
}
// 修改placeCard函数（添加渲染触发）
// 放置卡牌到指定区域（修改存储目标玩家）
// 修改placeCard函数（添加断牌效果逻辑）
// 修改placeCard函数（添加接牌效果逻辑）
// 修改placeCard函数（修正接牌效果逻辑）
function placeCard(position, targetPlayer) { 
    if (!GAME_STATE.selectedCard) return;

    const gapPositions = ['gap1', 'gap2', 'gap3', 'gap4'];
    const isGapArea = gapPositions.includes(position);
    const gapAdjacentAreas = { 
        gap1: ['left1', 'left2'],
        gap2: ['left2', 'mid'],
        gap3: ['mid', 'right2'],
        gap4: ['right2', 'right1']
    };
    
    // 关键新增：非间隔区域禁止放置断/接牌
    if (['断', '接'].includes(GAME_STATE.selectedCard.name) && !isGapArea) {
        alert('断和接牌只能放置在间隔区域！');
        return;
    }

    // 关键新增：间隔区域禁止放置其他类型卡牌
    if (!['断', '接'].includes(GAME_STATE.selectedCard.name) && isGapArea) {
        alert('间隔区域仅允许放置断和接牌！');
        return;
    }

    const currentAreaCards = GAME_STATE.players[targetPlayer].board[position] || [];
    const hasDisconnectOrConnect = currentAreaCards.some(c => ['断', '接'].includes(c.card.name));
    
    // 关键新增：阻止重复放置断/接牌
    if (['断', '接'].includes(GAME_STATE.selectedCard.name) && hasDisconnectOrConnect) {
        alert('该区域已存在断或接牌，无法重复放置');
        return;
    }

    // 添加新卡牌（保留原有卡牌）
    currentAreaCards.push({
        card: GAME_STATE.selectedCard,
        qi: GAME_STATE.selectedCard.type === 'stone' ? 4 : 0
    });
    GAME_STATE.players[targetPlayer].board[position] = currentAreaCards;

    // 关键修复：仅执行一次手牌移除（避免重复）
    const currentPlayer = GAME_STATE.currentPlayer;
    GAME_STATE.players[currentPlayer].hand = GAME_STATE.players[currentPlayer].hand
        .filter(c => c !== GAME_STATE.selectedCard);

    // 新增：应用"断"牌效果（标记对手区域为断开）
    // 修改placeCard函数中的断牌效果逻辑
    if (GAME_STATE.selectedCard.name === '断') {
        const currentPlayer = GAME_STATE.currentPlayer;
        const opponent = currentPlayer === 'black' ? 'white' : 'black';
        // 关键修正：将断开的区域存储在当前玩家的disconnectedAreas中（而非对手的）
        if (!GAME_STATE.players[currentPlayer].disconnectedAreas.includes(position)) {
            GAME_STATE.players[currentPlayer].disconnectedAreas.push(position);
            console.log(`触发断牌效果！${opponent}的区域${position}已被断开，无法连接相邻区域`);
        }
    }

    // 新增：应用"长"牌效果（气+3并同步连接区域）
    if (GAME_STATE.selectedCard.name === '长') {
        const currentAreaCards = GAME_STATE.players[targetPlayer].board[position] || [];
        const stoneCard = currentAreaCards.find(c => c.card.type === 'stone');
        if (stoneCard) {
            const newQi = stoneCard.qi + 3;
            // 调用同步函数更新所有连接区域
            syncConnectedQi(targetPlayer, position, newQi);
            // 移除alert提示，改为控制台日志（保留调试信息）
            console.log(`触发长牌效果！${position}区域气值增加3，当前气值：${newQi}`);
        }
    }

    // 新增：应用"围"牌效果（目+5）
    // 修改 "围" 牌目数更新逻辑（统一使用 GAME_STATE 中的 blackScore/whiteScore）
    if (GAME_STATE.selectedCard.name === '围') {
        const currentPlayer = GAME_STATE.currentPlayer;
        const areaMultipliers = { left1: 1, right1: 1, left2: 2, right2: 2, mid: 3 };
        const multiplier = areaMultipliers[position];
        const baseScore = 5 * multiplier;
        
        // 党毅飞技能：每个含围牌的区域额外+2
        const isDangYifei = GAME_STATE.players[currentPlayer].character?.name === '党毅飞';
        const skillBonus = isDangYifei ? 2 : 0;
        
        // 总目数 = 基础目数 + 技能加成
        const totalScore = baseScore + skillBonus;
        
        // 柯洁手筋牌效果翻倍（围牌属于招法牌，若手筋牌需单独处理）
        if (GAME_STATE.selectedCard.type === 'technique' && GAME_STATE.players[currentPlayer].character?.name === '柯洁') {
            totalScore *= 2;
        }
        GAME_STATE.players[currentPlayer].score += totalScore; // 直接更新玩家目数字段
        document.getElementById(`${currentPlayer}-score`).textContent = GAME_STATE.players[currentPlayer].score; // 同步更新界面
        updateHealthBars(); // 新增：更新血条
        console.log(`触发围牌效果！${currentPlayer}目数增加${totalScore}（基础${baseScore} + 党毅飞技能${skillBonus}），当前总目数：${GAME_STATE.players[currentPlayer].score}`);
    }

    if (GAME_STATE.selectedCard.name === '做眼') {
        const currentPlayer = GAME_STATE.currentPlayer;
        const areaMultipliers = { left1: 1, right1: 1, left2: 2, right2: 2, mid: 3 };
        const multiplier = areaMultipliers[position];
        GAME_STATE.players[currentPlayer].score += 1; // 直接更新玩家目数字段
        document.getElementById(`${currentPlayer}-score`).textContent = GAME_STATE.players[currentPlayer].score; // 同步更新界面
        updateHealthBars(); // 新增：更新血条
        console.log(`触发做眼牌效果！${currentPlayer}目数增加1，当前总目数：${GAME_STATE[`${currentPlayer}Score`]}`);
    }

    // 新增：应用"做眼"牌效果（目+1，并更新界面显示）
    // 原有提牌逻辑（修改为检查做眼牌数量）
    if (GAME_STATE.selectedCard.name === '提') {
        const currentPlayer = GAME_STATE.currentPlayer;
        const opponent = currentPlayer === 'black' ? 'white' : 'black';
        
        // 关键确认：targetPlayer应为对手（提牌目标是对手区域）
        const targetPlayer = opponent; // 显式指定，避免逻辑错误
        
        // 获取双方当前区域的棋子气值（考虑古力技能和金鸡独立加成）
    const selfAreaCards = GAME_STATE.players[currentPlayer].board[position] || [];
    const selfStones = selfAreaCards.filter(c => c.card.type === 'stone');
    const selfQi = selfStones.reduce((sum, stone) => {
        const isGuLi = GAME_STATE.players[currentPlayer].character?.name === '古力';
        // 检查当前区域是否有未触发的金鸡独立手筋牌
        const hasGoldenRooster = GAME_STATE.techniqueTrackers.goldenRooster.some(tracker => 
            tracker.position === position && 
            tracker.sourcePlayer === currentPlayer && 
            !tracker.triggered
        );
        return sum + (stone.qi + (isGuLi ? 1 : 0) + (hasGoldenRooster ? 1 : 0));
    }, 0);

    const opponentAreaCards = GAME_STATE.players[opponent].board[position] || [];
    const opponentStones = opponentAreaCards.filter(c => c.card.type === 'stone');
    const opponentQi = opponentStones.reduce((sum, stone) => {
        const isGuLi = GAME_STATE.players[opponent].character?.name === '古力';
        // 对手的金鸡独立同理（如果对手也有）
        const hasGoldenRooster = GAME_STATE.techniqueTrackers.goldenRooster.some(tracker => 
            tracker.position === position && 
            tracker.sourcePlayer === opponent && 
            !tracker.triggered
        );
        return sum + (stone.qi + (isGuLi ? 1 : 0) + (hasGoldenRooster ? 1 : 0));
    }, 0);
    
        // 关键修复：检查被提区域（targetPlayer）的做眼牌数量（而非固定对手区域）
        const targetAreaCards = GAME_STATE.players[targetPlayer].board[position] || []; // targetPlayer是被提的区域所属玩家
        const eyeCardsCount = targetAreaCards.filter(c => c.card.type === 'move' && c.card.name === '做眼').length;

        // 关键修正：判断被提牌的目标玩家（targetPlayer）是否为范廷钰，而非当前操作玩家（currentPlayer）
        const isFanTingyu = GAME_STATE.players[targetPlayer].character?.name === '范廷钰';  // 改为检查目标玩家是否是范廷钰
        const requiredEyeCards = isFanTingyu ? 1 : 2;  // 仅目标玩家是范廷钰时调整所需做眼牌数量

        if (selfQi > opponentQi && eyeCardsCount < requiredEyeCards) {
            // 触发后标记金鸡独立为已触发（避免重复计算）
            GAME_STATE.techniqueTrackers.goldenRooster = GAME_STATE.techniqueTrackers.goldenRooster.map(tracker => {
        if (tracker.position === position && 
            tracker.sourcePlayer === currentPlayer && 
            !tracker.triggered) {
            return { ...tracker, triggered: true };
        }
        return tracker;
    });
            // 移除被提区域的所有卡牌
        const removedCards = GAME_STATE.players[targetPlayer].board[position] || [];
        const removedCount = removedCards.length;

        // 新增：李世石技能触发
        const targetPlayerData = GAME_STATE.players[targetPlayer];
        if (targetPlayerData.character?.name === '李世石') {
            // 将移除的卡牌的card属性添加回手牌（避免重复）
            removedCards.forEach(({ card }) => {
                if (!targetPlayerData.hand.some(c => c === card)) {
                    targetPlayerData.hand.push(card);
                }
            });
        }

        // 提牌后检查倒脱靴触发条件
        const activeInvertedBoots = GAME_STATE.techniqueTrackers.invertedBoot.filter(tracker => 
            !tracker.triggered && 
            tracker.position === position && 
            tracker.sourcePlayer === targetPlayer // 倒脱靴触发者是被提方的原放置玩家
        );

        activeInvertedBoots.forEach(tracker => {
        handleInvertedBootTrigger(tracker, targetPlayer, removedCards, position);
    });
        
        // 清空被提区域的卡牌
        GAME_STATE.players[targetPlayer].board[position] = [];
        
        // 计算并更新目数（移除卡牌数×2）
        GAME_STATE.players[currentPlayer].score += removedCount * 2;
        document.getElementById(`${currentPlayer}-score`).textContent = GAME_STATE.players[currentPlayer].score;
        updateHealthBars(); // 新增：更新血条
        
        // 替换为alert提示
        alert(`提牌成功！移除${targetPlayer}区域${removedCount}张卡牌，${currentPlayer}获得${removedCount * 2}目`);
        } else if (eyeCardsCount >= requiredEyeCards) {
            // 替换为alert提示
            alert(`提牌失败！${targetPlayer}区域已有${eyeCardsCount}张做眼牌（${isFanTingyu ? '范廷钰技能：' : ''}需${requiredEyeCards}张免疫提掉）`);
        } else {
            // 替换为alert提示
            alert(`提牌失败！气值不足（当前玩家气值${selfQi}，对手气值${opponentQi}）`);
        }
    }   
    // 新增：应用"接"牌效果（相邻区域气值相加并记录连接关系）
    if (GAME_STATE.selectedCard.name === '接') {
        const adjacentAreas = gapAdjacentAreas[position]; 
        if (!adjacentAreas) return;

        const [areaA, areaB] = adjacentAreas;
        const areaACards = GAME_STATE.players[targetPlayer].board[areaA] || [];
        const areaBCards = GAME_STATE.players[targetPlayer].board[areaB] || [];
        const stoneA = areaACards.find(c => c.card.type === 'stone');
        const stoneB = areaBCards.find(c => c.card.type === 'stone');

        if (stoneA && stoneB) {
            const totalQi = stoneA.qi + stoneB.qi;
            // 使用同步函数更新所有连接区域（包括链式连接）
            syncConnectedQi(targetPlayer, areaA, totalQi);
            syncConnectedQi(targetPlayer, areaB, totalQi); // 确保双向同步
            alert(`触发接牌效果！${areaA}和${areaB}区域气值合并为${totalQi}`);
            
            // 记录连接关系（去重，新增归属标记）
            const isDuplicate = GAME_STATE.connectedAreas.some(connect => 
                (connect.areas[0] === areaA && connect.areas[1] === areaB) || 
                (connect.areas[0] === areaB && connect.areas[1] === areaA)
            );
            if (!isDuplicate) {
                const currentPlayer = GAME_STATE.currentPlayer; // 当前操作玩家
            GAME_STATE.connectedAreas.push({
                areas: adjacentAreas,
                owner: currentPlayer // 连接区域归属于当前操作玩家（明确归属）
            });
            }
        }   
    }   
    // 新增：处理盘角曲四手筋牌的放置
    if (GAME_STATE.selectedCard.name === '盘角曲四') {
        GAME_STATE.techniqueTrackers.discFour.push({
            sourcePlayer: GAME_STATE.currentPlayer,  // 记录放置该牌的玩家
            position: position,                     // 记录所在区域
            triggered: false                        // 标记是否已触发
        });
        console.log(`盘角曲四已放置在${position}区域，等待触发条件`);
    }

    // 新增：处理倒脱靴手筋牌的放置
    if (GAME_STATE.selectedCard.name === '倒脱靴') {
        GAME_STATE.techniqueTrackers.invertedBoot.push({
            sourcePlayer: GAME_STATE.currentPlayer,  // 记录放置该牌的玩家
            position: position,                     // 记录所在区域
            triggered: false                        // 标记是否已触发
        });
        console.log(`倒脱靴已放置在${position}区域，等待触发条件`);
    }

    // 新增：处理金鸡独立手筋牌的放置
if (GAME_STATE.selectedCard.name === '金鸡独立') {
    GAME_STATE.techniqueTrackers.goldenRooster.push({
        sourcePlayer: GAME_STATE.currentPlayer,  // 记录放置该牌的玩家
        position: position,                     // 记录所在区域
        triggered: false                        // 标记是否已触发（此处用于持续生效，可保持false）
    });
    console.log(`金鸡独立已放置在${position}区域，气值将双倍计算`);
}

// 新增：处理黄莺扑蝶手筋牌的放置
if (GAME_STATE.selectedCard.name === '黄莺扑蝶') {
    GAME_STATE.techniqueTrackers.yellowWarbler.push({
        position: position,          // 记录所在间隔区域（如gap1）
        sourcePlayer: GAME_STATE.currentPlayer  // 记录放置玩家
    });
    console.log(`黄莺扑蝶已放置在${position}区域，将影响接牌效果`);
}

    // 放置卡牌后检查盘角曲四触发条件（对手在对应区域达到4张）
    const currentOpponent = GAME_STATE.currentPlayer === 'black' ? 'white' : 'black';
    const activeDiscFours = GAME_STATE.techniqueTrackers.discFour.filter(tracker => 
        !tracker.triggered && 
        tracker.position === position && 
        tracker.sourcePlayer === currentOpponent  // 触发者是当前玩家的对手
    );

    activeDiscFours.forEach(tracker => {
        const targetAreaCards = GAME_STATE.players[GAME_STATE.currentPlayer].board[position] || [];
        if (targetAreaCards.length === 4) {  // 区域卡牌数达到4
            // 新增：记录被移除的卡牌
            const removedCards = [...targetAreaCards];

            // 触发提子效果：清空该区域卡牌
            GAME_STATE.players[GAME_STATE.currentPlayer].board[position] = [];

            // 新增：李世石技能触发
            const currentPlayerData = GAME_STATE.players[GAME_STATE.currentPlayer];
            if (currentPlayerData.character?.name === '李世石') {
                removedCards.forEach(card => {
                    if (!currentPlayerData.hand.includes(card)) {
                        currentPlayerData.hand.push(card);
                    }
                });
            }

            // 原放置者获得提子目数（根据盘角曲四规则调整基数）
        const baseTaken = 3; // 原提掉棋子数
        const baseScore = 8; // 原目数加成
        const isKejie = GAME_STATE.players[tracker.sourcePlayer].character?.name === '柯洁';
        const finalTaken = isKejie ? baseTaken * 2 : baseTaken; // 提牌数翻倍（柯洁技能）
        const finalScore = isKejie ? baseScore * 2 : baseScore; // 目数翻倍（柯洁技能）
        GAME_STATE.players[tracker.sourcePlayer].score += finalScore; // 应用最终目数加成
            // 更新界面显示
            document.getElementById(`${tracker.sourcePlayer}-score`).textContent = GAME_STATE.players[tracker.sourcePlayer].score;
            updateHealthBars();
            // 标记为已触发
            tracker.triggered = true;
            alert(`盘角曲四触发！${GAME_STATE.currentPlayer}在${position}区域达到4张，被${tracker.sourcePlayer}提掉！`);
        }
    });

    // 清除高亮和选中状态
    clearHighlights();
    GAME_STATE.selectedCard = null;
    
    // 关键新增：放置卡牌后强制渲染牌桌（更新气、目等状态）
    renderBoard();
    handleTurnEnd();
    renderBoard(); // 放置后渲染牌桌
}


// 修改startGame函数（初始渲染牌桌）
function startGame() {
    initDeck();
    drawInitialHands();
    renderHandCards();
    renderBoard(); // 新增：游戏启动时渲染牌桌
}

// 清除区域高亮
function clearHighlights() {
    const allAreas = document.querySelectorAll('.area');
    allAreas.forEach(area => {
        area.style.borderColor = '#654321'; // 恢复默认边框颜色
        area.onclick = null; // 移除区域点击事件
    });

    // 绑定'时越'技能按钮点击事件
    document.getElementById('shiyue-skill-btn').onclick = activateShiyueSkill;
    document.getElementById('zhenxu-skill-btn').onclick = activateZhenXuSkill; // 新增
    document.getElementById('bianxiangyi-skill-btn').onclick = activateBianXiangYiSkill; // 新增
}
// 处理回合结束（合并原有逻辑）
function handleTurnEnd() {
    const currentPlayer = GAME_STATE.currentPlayer; // 记录当前出牌玩家
    GAME_STATE.remainingTurns--;
    document.getElementById('remaining-turns').textContent = GAME_STATE.remainingTurns;



    // 关键修复：无论牌堆是否耗尽，保持手牌数量（初始5张）
    if (GAME_STATE.deck.length > 0) {
        GAME_STATE.players[currentPlayer].hand.push(GAME_STATE.deck.pop());
    } else {
        // 牌堆耗尽时，从已打出的牌中回收（简化逻辑，实际需实现弃牌堆）
        // 示例：假设已打出的牌存在GAME_STATE.discardedPile中（需补充该字段）
        // if (GAME_STATE.discardedPile.length > 0) {
        //     GAME_STATE.players[currentPlayer].hand.push(GAME_STATE.discardedPile.pop());
        // }
        console.log('牌堆已空，手牌数量保持不变');
    }

    // 切换玩家（核心交替逻辑）
    switchPlayer();
    renderHandCards();
}

// 玩家切换逻辑（包含回合结束判断）
// 更新目数血条比例
function updateHealthBars() {
    const blackScore = GAME_STATE.players.black.score;
    const whiteScore = GAME_STATE.players.white.score;
    const total = blackScore + whiteScore;

    const blackBar = document.getElementById('black-health-bar');
    const whiteBar = document.getElementById('white-health-bar');

    if (total === 0) {
        blackBar.style.width = '50%';
        whiteBar.style.width = '50%';
        return;
    }

    const blackPercent = (blackScore / total) * 100;
    const whitePercent = (whiteScore / total) * 100;
    blackBar.style.width = `${blackPercent}%`;
    whiteBar.style.width = `${whitePercent}%`;
}

// 在目数变化的位置调用（例如switchPlayer函数末尾）
function switchPlayer() {
    // 检查是否所有回合已结束
    if (GAME_STATE.remainingTurns <= 0) {
        endGame();
        return;
    }

    // 切换当前玩家（黑→白 或 白→黑）
    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer === 'black' ? 'white' : 'black';
    document.getElementById('current-player').textContent = GAME_STATE.currentPlayer === 'black' ? '黑方' : '白方';

    // 关键新增：切换玩家后强制渲染牌桌（确保状态更新）
    renderBoard();

    // 机器人回合自动出牌（移除延迟）
    if (GAME_STATE.isRobot[GAME_STATE.currentPlayer]) {
        robotPlay(); // 直接调用，无需setTimeout延迟
    }

    // 新增：同步更新目数显示和血条
    document.getElementById('black-score').textContent = GAME_STATE.players.black.score;
    document.getElementById('white-score').textContent = GAME_STATE.players.white.score;
    updateHealthBars(); // 强制触发血条更新

    // 新增：更新目数显示和血条
    document.getElementById('black-score').textContent = GAME_STATE.players.black.score;
    document.getElementById('white-score').textContent = GAME_STATE.players.white.score;
    updateHealthBars(); // 关键调用
}

// 修改startGame函数（初始渲染牌桌）
function startGame() {
    initDeck();
    drawInitialHands();
    renderHandCards();
    renderBoard(); // 新增：游戏启动时渲染牌桌
}

// 清除区域高亮
function clearHighlights() {
    const allAreas = document.querySelectorAll('.area');
    allAreas.forEach(area => {
        area.style.borderColor = '#654321'; // 恢复默认边框颜色
        area.onclick = null; // 移除区域点击事件
    });

    // 绑定'时越'技能按钮点击事件
    document.getElementById('shiyue-skill-btn').onclick = activateShiyueSkill;
    document.getElementById('zhenxu-skill-btn').onclick = activateZhenXuSkill; // 新增
    document.getElementById('bianxiangyi-skill-btn').onclick = activateBianXiangYiSkill; // 新增
}
// 处理回合结束（合并原有逻辑）
function handleTurnEnd() {
    const currentPlayer = GAME_STATE.currentPlayer; // 记录当前出牌玩家
    GAME_STATE.remainingTurns--;
    document.getElementById('remaining-turns').textContent = GAME_STATE.remainingTurns;



    // 关键修复：无论牌堆是否耗尽，保持手牌数量（初始5张）
    if (GAME_STATE.deck.length > 0) {
        GAME_STATE.players[currentPlayer].hand.push(GAME_STATE.deck.pop());
    } else {
        // 牌堆耗尽时，从已打出的牌中回收（简化逻辑，实际需实现弃牌堆）
        // 示例：假设已打出的牌存在GAME_STATE.discardedPile中（需补充该字段）
        // if (GAME_STATE.discardedPile.length > 0) {
        //     GAME_STATE.players[currentPlayer].hand.push(GAME_STATE.discardedPile.pop());
        // }
        console.log('牌堆已空，手牌数量保持不变');
    }

    // 切换玩家（核心交替逻辑）
    switchPlayer();
    renderHandCards();
}

// 玩家切换逻辑（包含回合结束判断）
function switchPlayer() {
    // 检查是否所有回合已结束
    if (GAME_STATE.remainingTurns <= 0) {
        endGame();
        return;
    }

    // 切换当前玩家（黑→白 或 白→黑）
    GAME_STATE.currentPlayer = GAME_STATE.currentPlayer === 'black' ? 'white' : 'black';
    document.getElementById('current-player').textContent = GAME_STATE.currentPlayer === 'black' ? '黑方' : '白方';

    // 关键新增：切换玩家后强制渲染牌桌（确保状态更新）
    renderBoard();

    // 机器人回合自动出牌（移除延迟）
    if (GAME_STATE.isRobot[GAME_STATE.currentPlayer]) {
        robotPlay(); // 直接调用，无需setTimeout延迟
    }

    // 新增：同步更新目数显示和血条
    document.getElementById('black-score').textContent = GAME_STATE.players.black.score;
    document.getElementById('white-score').textContent = GAME_STATE.players.white.score;
    updateHealthBars(); // 强制触发血条更新

    // 修正：杨鼎新技能触发条件调整为剩余回合数20时检查
    if (GAME_STATE.remainingTurns === 20) { 
        const currentPlayer = GAME_STATE.currentPlayer;
        const player = GAME_STATE.players[currentPlayer];
        if (player.character?.name === '杨鼎新') {
            const requiredAreas = ['left1', 'left2', 'mid', 'right2', 'right1']; // 对应左1路、左2路、3路、右2路、右1路

            // 检查5个区域是否都有棋子牌（type为'stone'）
            const allAreasOccupied = requiredAreas.every(area => {
                const areaCards = player.board[area] || [];
                return areaCards.some(card => card.card.type === 'stone');
            });
            
            if (allAreasOccupied) {
                endGame(currentPlayer); // 传递胜利者参数
                return;
            }
        }
    }

    updateShiyueSkillButton(); // 新增：更新技能按钮状态
    updateZhenXuSkillButton(); // 新增：更新申真谞按钮状态
    updateBianXiangYiSkillButton(); // 新增：更新卞相一按钮状态
}

// 修正：endGame函数优先处理区域胜利条件
function endGame(winner) {
    // 优先处理杨鼎新等特殊角色的区域胜利
    if (winner) {
        const winnerName = winner === 'black' ? '黑方（杨鼎新）' : '白方（杨鼎新）';
        alert(`${winnerName}在左1路、左2路、3路、右2路、右1路均有棋子，直接获胜！`);
        // 可选：重置游戏状态
        return;
    }

    // 原有目数比较逻辑
    const blackScore = GAME_STATE.players.black.score;
    const whiteScore = GAME_STATE.players.white.score;
    let resultMessage;

    if (blackScore > whiteScore) {
        resultMessage = `黑方获胜！目数：${blackScore} - ${whiteScore}`;
    } else if (whiteScore > blackScore) {
        resultMessage = `白方获胜！目数：${whiteScore} - ${blackScore}`;
    } else {
        resultMessage = `平局！双方目数均为${blackScore}`;
    }

    alert(resultMessage); // 弹出最终结果提示
    // 可选：添加游戏重置逻辑（如清空棋盘、重新发牌等）
}

// 新增：更新技能按钮显示状态
function updateShiyueSkillButton() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const player = GAME_STATE.players[currentPlayer];
    const button = document.getElementById('shiyue-skill-btn');
    
    // 关键验证：输出调试信息确认条件是否满足
    console.log('当前玩家角色:', player.character?.name);
    console.log('技能是否已使用:', player.usedSkills.shiYue);
    
    if (player.character?.name === '时越' && !player.usedSkills.shiYue) {
        button.style.display = 'block'; // 应显示按钮
    } else {
        button.style.display = 'none';
    }
}

// 新增：时越技能触发逻辑
function activateShiyueSkill() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const player = GAME_STATE.players[currentPlayer];
    
    // 检查技能是否可用
    if (player.character?.name !== '时越' || player.usedSkills.shiYue) {
        alert('当前无法发动时越技能');
        return;
    }

    // 查找牌堆中的「提」牌
    const tiCards = GAME_STATE.deck.filter(card => 
        card.type === 'move' && card.name === '提'
    );

    if (tiCards.length === 0) {
        alert('牌堆中没有「提」牌，无法发动技能');
        return;
    }

    // 随机选择一张「提」牌（实际可扩展为玩家手动选择）
    const selectedTiCard = tiCards[Math.floor(Math.random() * tiCards.length)];
    const deckIndex = GAME_STATE.deck.indexOf(selectedTiCard);

    // 从牌堆移除并添加到手牌
    GAME_STATE.deck.splice(deckIndex, 1);
    player.hand.push(selectedTiCard);
    player.usedSkills.shiYue = true; // 标记技能已使用

    // 更新UI
    renderHandCards();
    updateShiyueSkillButton();
    alert('已成功将一张「提」牌加入手牌');
}

// 倒脱靴技能触发逻辑
function handleInvertedBootTrigger(tracker, targetPlayer, removedCards, position) {
    const targetPlayerData = GAME_STATE.players[targetPlayer];
    // 李世石技能触发
    if (targetPlayerData.character?.name === '李世石') {
        removedCards.forEach(card => {
            if (!targetPlayerData.hand.includes(card)) {
                targetPlayerData.hand.push(card);
            }
        });
    }

    // 倒脱靴触发：原放置玩家获得基础目数加成（柯洁技能翻倍）
    const isKejie = GAME_STATE.players[tracker.sourcePlayer].character?.name === '柯洁';
    const baseScore = 5; // 原基础目数加成
    const finalScore = isKejie ? baseScore * 2 : baseScore; // 柯洁时翻倍
    GAME_STATE.players[tracker.sourcePlayer].score += finalScore;
    // 更新界面显示
    document.getElementById(`${tracker.sourcePlayer}-score`).textContent = GAME_STATE.players[tracker.sourcePlayer].score;
    updateHealthBars();
    // 标记为已触发
    tracker.triggered = true;
    alert(`倒脱靴触发！${tracker.sourcePlayer}在${position}区域获得${finalScore}目！`);
}

// 更新申真谞技能按钮显示状态
function updateZhenXuSkillButton() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const player = GAME_STATE.players[currentPlayer];
    const button = document.getElementById('zhenxu-skill-btn');
    
    // 仅当玩家选择申真谞且技能未使用时显示
    if (player.character?.name === '申真谞' && !player.usedSkills.zhenXu) {
        button.style.display = 'block';
    } else {
        button.style.display = 'none';
    }
}

// 申真谞技能触发逻辑
function activateZhenXuSkill() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const player = GAME_STATE.players[currentPlayer];
    const opponent = currentPlayer === 'black' ? 'white' : 'black';
    const opponentHand = GAME_STATE.players[opponent].hand;

    // 检查技能是否可用
    if (player.character?.name !== '申真谞' || player.usedSkills.zhenXu) {
        alert('当前无法发动申真谞技能');
        return;
    }

    // 筛选对手的手筋牌（type为'technique'）
    const techniqueCards = opponentHand.filter(card => card.type === 'technique');
    if (techniqueCards.length === 0) {
        alert('对手没有手筋牌，无法发动技能');
        return;
    }

    // 随机选择一张手筋牌
    const randomIndex = Math.floor(Math.random() * techniqueCards.length);
    const selectedCard = techniqueCards[randomIndex];

    // 显示手筋牌信息（名称+效果）
    alert(`对手的手筋牌：${selectedCard.name}\n效果：${selectedCard.effect}`);

    // 标记技能为已使用
    player.usedSkills.zhenXu = true;
    updateZhenXuSkillButton(); // 更新按钮状态
}

// 更新卞相一技能按钮显示状态
function updateBianXiangYiSkillButton() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const player = GAME_STATE.players[currentPlayer];
    const button = document.getElementById('bianxiangyi-skill-btn');
    
    if (player.character?.name === '卞相一') {
        if (player.usedSkills.bianXiangYi < 2) {
            button.textContent = `发动卞相一技能（剩余${2 - player.usedSkills.bianXiangYi}次）`;
        } else {
            button.textContent = '卞相一技能次数已用完'; // 保留按钮但提示次数耗尽
        }
        button.style.display = 'block'; // 始终显示按钮（无论次数是否用完）
    } else {
        button.style.display = 'none'; // 非卞相一角色隐藏按钮
    }
}

// 卞相一技能触发逻辑（显示对手手牌/返回自己手牌）
let isViewingOpponentHand = false; // 记录当前是否在查看对手手牌
function activateBianXiangYiSkill() {
    const currentPlayer = GAME_STATE.currentPlayer;
    const player = GAME_STATE.players[currentPlayer];
    const opponent = currentPlayer === 'black' ? 'white' : 'black';
    const opponentHand = GAME_STATE.players[opponent].hand;
    const button = document.getElementById('bianxiangyi-skill-btn');

    if (isViewingOpponentHand) {
        // 无论次数是否用完，只要在查看对手手牌时点击，就返回自己手牌
        renderHandCards(); 
        button.textContent = player.usedSkills.bianXiangYi < 2 
            ? `发动卞相一技能（剩余${2 - player.usedSkills.bianXiangYi}次）`
            : '卞相一技能次数已用完';
        isViewingOpponentHand = false;
        return;
    }

    // 未在查看对手手牌时，检查技能是否可用
    if (player.character?.name !== '卞相一' || player.usedSkills.bianXiangYi >= 2) {
        alert('当前无法发动卞相一技能（次数已用完）');
        return;
    }

    // 正常消耗次数并显示对手手牌（原有逻辑）
    player.usedSkills.bianXiangYi++;
    updateBianXiangYiSkillButton();

    const container = document.querySelector('#hand-cards .card-container');
    container.innerHTML = '';
    opponentHand.forEach(card => {
        const cardElem = document.createElement('div');
        cardElem.className = `card ${card.type}`;
        cardElem.innerHTML = `
            <img src="${card.image}" alt="${card.name}" style="width:100%; height:100%; object-fit:cover;">
            <div style="font-size:12px; text-align:center;">${card.name}</div>
        `;
        container.appendChild(cardElem);
    });
    button.textContent = '返回查看自己手牌';
    isViewingOpponentHand = true;

    // 检查手牌顺序（原有逻辑）
    const cardTypesOrder = opponentHand.map(c => c.type);
    const isOrdered = 
        cardTypesOrder.every(t => t === 'stone') || 
        (cardTypesOrder.every((t, i) => 
            (i < cardTypesOrder.findIndex(t => t !== 'stone') && t === 'stone') || 
            (i >= cardTypesOrder.findIndex(t => t !== 'stone') && t === 'move') ||
            (i >= cardTypesOrder.findIndex(t => t === 'technique') && t === 'technique')
        ));

    if (!isOrdered) {
        if (player.usedSkills.bianXiangYi === 1) {
            player.score += 2; 
            alert('对手手牌未按顺序摆放，你的目数+2');
        } else if (player.usedSkills.bianXiangYi === 2) {
            endGame(currentPlayer); 
        }
    }
}

// 获取指定玩家指定区域的棋子气值（无棋子牌返回0）
// 计算指定玩家指定区域的棋子气值总和
function getStoneQi(player, position) {
    const areaCards = GAME_STATE.players[player].board[position] || [];
    return areaCards.filter(c => c.card.type === 'stone').reduce((sum, card) => sum + card.qi, 0);
}

// 新增：更新剩余卡牌数显示
function updateRemainingDeck() {
    const remainingDeckElem = document.getElementById('remaining-deck');
    if (remainingDeckElem) {
        remainingDeckElem.textContent = GAME_STATE.deck.length; // 显示牌堆实际长度
    }
}

// 修改startGame函数，初始化时显示剩余卡牌数
function startGame() {
    initDeck();
    drawInitialHands();
    renderHandCards();
    updateRemainingDeck(); // 新增：初始化时更新显示
}

// 修改playCard函数，抽牌后更新剩余卡牌数
function playCard(card) {
    // 合并后的playCard函数（保留完整逻辑）
    function playCard(card) {
        // 从手牌中移除已打出的卡牌（仅执行一次）
        const currentHand = GAME_STATE.players[GAME_STATE.currentPlayer].hand;
        GAME_STATE.players[GAME_STATE.currentPlayer].hand = currentHand.filter(c => c !== card);
        
        // 处理回合结束逻辑
        GAME_STATE.remainingTurns--;
        document.getElementById('remaining-turns').textContent = GAME_STATE.remainingTurns;
        
        // 每回合结束抽1张牌（牌堆有牌时补充）
        if (GAME_STATE.deck.length > 0) {
            GAME_STATE.players[GAME_STATE.currentPlayer].hand.push(GAME_STATE.deck.pop());
        } else {
            console.log('牌堆已空，无法继续抽牌');
        }
        
        // 切换玩家（回合数为0时结束游戏）
        if (GAME_STATE.remainingTurns <= 0) {
            endGame();
            return;
        }
        GAME_STATE.currentPlayer = GAME_STATE.currentPlayer === 'black' ? 'white' : 'black';
        document.getElementById('current-player').textContent = GAME_STATE.currentPlayer === 'black' ? '黑方' : '白方';
        
        renderHandCards(); // 重新渲染手牌
        console.log(`打出${card.name}`);
    }

    // 每回合结束抽1张牌
    if (GAME_STATE.deck.length > 0) {
        GAME_STATE.players[GAME_STATE.currentPlayer].hand.push(GAME_STATE.deck.pop());
    } else {
        console.log('牌堆已空，无法继续抽牌');
    }

    updateRemainingDeck(); // 新增：抽牌后更新显示

    // ...原有玩家切换逻辑...
}

// 新增：更新棋子气值的函数
function updateStoneQi(player, position, newQi) {
    const areaCards = GAME_STATE.players[player].board[position] || [];
    const stoneCard = areaCards.find(c => c.card.type === 'stone'); // 查找该区域的棋子牌
    if (stoneCard) {
        stoneCard.qi = newQi; // 更新气值
    }
}

// 新增：同步所有连接区域的气值（处理链式连接）
function syncConnectedQi(targetPlayer, startArea, newQi) {
    const visitedAreas = new Set(); // 防止循环访问
    const queue = [startArea]; // 初始区域队列

    while (queue.length > 0) {
        const currentArea = queue.shift();
        if (visitedAreas.has(currentArea)) continue;
        visitedAreas.add(currentArea);

        // 更新当前区域气值
        const currentAreaCards = GAME_STATE.players[targetPlayer].board[currentArea] || [];
        const stoneCard = currentAreaCards.find(c => c.card.type === 'stone');
        if (stoneCard) stoneCard.qi = newQi;

        // 查找所有包含当前区域的连接对（访问对象的areas数组）
        const connectedPairs = GAME_STATE.connectedAreas.filter(connectObj => connectObj.areas.includes(currentArea));
        connectedPairs.forEach(connectObj => {
            const pair = connectObj.areas;
            const otherArea = pair.find(area => area !== currentArea);
            if (!visitedAreas.has(otherArea)) {
                queue.push(otherArea); // 将连接的其他区域加入队列
            }
        });
    }
}

// 计算玩家得分（提子数×2 + 区域目数×区域倍率）
// 计算玩家总目数（提子数×2 + 区域目数×倍率）
function calculateTotalScore(playerKey) {
    const player = GAME_STATE.players[playerKey];
    const { board, capturedStones = 0 } = player; // 假设已添加capturedStones字段记录提子数
    const areaMultipliers = { left1: 1, right1: 1, left2: 2, right2: 2, mid: 3 };
    let totalScore = capturedStones * 2; // 提子数×2

    // 遍历所有区域计算目数×倍率
    Object.entries(board).forEach(([position, areaCards]) => {
        const moveCards = areaCards.filter(c => c.card.type === 'move');
        const moveScore = (
            moveCards.filter(c => c.card.name === '围').length * 5 + 
            moveCards.filter(c => c.card.name === '做眼').length * 1
        );
        const multiplier = areaMultipliers[position];
        totalScore += moveScore * multiplier; // 区域目数×倍率
    });

    return totalScore;
}


// 加载页面控制
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const startGameBtn = document.getElementById('start-game');
    const showRulesBtn = document.getElementById('show-rules');
    const showCharactersBtn = document.getElementById('show-characters');

    // 开始游戏按钮
    startGameBtn.addEventListener('click', () => {
        loadingScreen.style.display = 'none';
        initCharacterSelection(); 
    });

    // 规则说明按钮
    showRulesBtn.addEventListener('click', () => {
        loadingScreen.style.display = 'none';
        const rulesModal = document.createElement('div');
        rulesModal.className = 'modal';
        rulesModal.innerHTML = `
            <div class="modal-content">
                <h2>基础规则</h2>
                <p>1. 每回合玩家可打出1张手牌到对应棋盘区域</p>
                <p>2. 棋子牌（气=4）需通过招法牌（长/围/接/断等）增强</p>
                <p>3. 手筋牌（金鸡独立/倒脱靴等）可触发特殊效果</p>
                <p>4. 目数高者获胜，总回合60轮（每方30轮）</p>
                <button class="close-btn">关闭</button>
            </div>
        `;
        document.body.appendChild(rulesModal);
        rulesModal.style.display = 'flex';
        // 关闭规则模态框时恢复loading-screen
        rulesModal.querySelector('.close-btn').addEventListener('click', () => {
            rulesModal.remove();
            loadingScreen.style.display = 'flex'; // 新增：恢复加载页显示
        });
    });

    // 角色介绍按钮
    showCharactersBtn.addEventListener('click', () => {
        loadingScreen.style.display = 'none';
        const chars = [
            { name: '古力', skill: '你的每个区域的棋子牌“气”加1（与招法牌、手筋牌效果累加）' },
            { name: '李世石', skill: '你的卡牌被移除后（包括被提掉、触发手筋牌移出等），将直接回到手牌（不占用抽牌次数）' },
            { name: '柯洁', skill: '你手筋牌的效果翻倍' }
        ];
        const charsHTML = chars.map(c => `
            <div class="character-item">
                <h3>${c.name}</h3>
                <p>${c.skill}</p>
            </div>
        `).join('');
        
        const charsModal = document.createElement('div');
        charsModal.className = 'modal';
        charsModal.innerHTML = `
            <div class="modal-content">
                <h2>角色技能</h2>
                <div class="character-list" style="max-height: 400px; overflow-y: auto;">
                    ${charsHTML}
                </div>
                <button class="close-btn">关闭</button>
            </div>
        `;
        document.body.appendChild(charsModal);
        charsModal.style.display = 'flex';
        // 关闭角色模态框时恢复loading-screen
        charsModal.querySelector('.close-btn').addEventListener('click', () => {
            charsModal.remove();
            loadingScreen.style.display = 'flex'; // 新增：恢复加载页显示
        });
    });
});