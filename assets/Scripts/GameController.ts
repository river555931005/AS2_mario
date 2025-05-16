/**
 * 遊戲控制器
 * 負責遊戲場景的管理和UI顯示
 */

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    
    // 預設資源
    @property(cc.Prefab)
    private playerPrefab: cc.Prefab = null;
    
    @property([cc.Prefab])
    private enemyPrefabs: cc.Prefab[] = [];
    
    @property(cc.Prefab)
    private blockPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private mushRoomPrefab: cc.Prefab = null;
    
    @property(cc.TiledMap)
    private tiledMap: cc.TiledMap = null;
    
    // UI元素
    @property(cc.Label)
    private scoreLabel: cc.Label = null;
    
    @property(cc.Label)
    private lifeLabel: cc.Label = null;
    
    @property(cc.Label)
    private timerLabel: cc.Label = null;
    
    @property(cc.Node)
    private pauseUI: cc.Node = null;
    
    // 音效
    @property(cc.AudioClip)
    private bgm: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private levelClearSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private gameOverSound: cc.AudioClip = null;
      // 私有屬性
    private player: cc.Node = null;
    private isPaused: boolean = false;
    private isGameOver: boolean = false;
    private isLevelClear: boolean = false;
    private audioID: number = null;
    private timeCounter: number = 0;
    private camera: cc.Camera = null;
    private playerSpawnPoint: cc.Vec2 = cc.v2(0, 0);
    
    onLoad() {
        // 初始化物理引擎
        this.initPhysics();
        
        // 創建遊戲場景
        this.createGameScene();
        
        // 初始化UI
        this.initUI();
        
        // 註冊鍵盤事件
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    start() {
        // 播放背景音樂
        if (this.bgm) {
            this.audioID = cc.audioEngine.playMusic(this.bgm, true);
        }
        
        // 啟動計時器
        this.schedule(this.updateTimer, 1);
    }
    
    update(dt) {
        if (this.isPaused || this.isGameOver || this.isLevelClear) {
            return;
        }
        
        // 更新鏡頭位置
        this.updateCamera();
        
        // 檢查關卡結束條件
        this.checkLevelClear();
    }
    
    // 初始化物理引擎
    private initPhysics() {
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -800);
        
        // 開啟碰撞偵測
        const collisionManager = cc.director.getCollisionManager();
        collisionManager.enabled = true;
    }
      // 創建遊戲場景
    private createGameScene() {
        // 設置初始遊戲參數
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (gameManager) {
            gameManager.remainingTime = 300;
        }
        
        // 創建地圖生成器
        const mapGeneratorNode = new cc.Node('MapGenerator');
        const mapGenerator = mapGeneratorNode.addComponent('MapGenerator');
        this.node.addChild(mapGeneratorNode);
        
        // 創建玩家
        this.createPlayer();
        
        // 創建相機
        this.createCamera();
    }
    
    // 從Tiled地圖創建場景
    private createMapFromTiled() {
        // 獲取圖層
        const wallLayer = this.tiledMap.getLayer('walls');
        const objectsLayer = this.tiledMap.getObjectGroup('objects');
        
        // 為牆壁創建碰撞區域
        if (wallLayer) {
            const tiledSize = this.tiledMap.getTileSize();
            const layer = wallLayer.getComponent(cc.TiledLayer);
            const layerSize = layer.getLayerSize();
            
            for (let i = 0; i < layerSize.width; i++) {
                for (let j = 0; j < layerSize.height; j++) {
                    const tileGid = layer.getTileGIDAt(i, j);
                    if (tileGid > 0) {
                        const node = new cc.Node("wall");
                        node.group = "ground";
                        
                        node.setPosition(
                            i * tiledSize.width + tiledSize.width/2,
                            (layerSize.height - j - 1) * tiledSize.height + tiledSize.height/2
                        );
                        
                        const body = node.addComponent(cc.RigidBody);
                        body.type = cc.RigidBodyType.Static;
                        
                        const collider = node.addComponent(cc.PhysicsBoxCollider);
                        collider.size = tiledSize;
                        collider.offset = cc.v2(0, 0);
                        collider.sensor = false;
                        
                        this.node.addChild(node);
                    }
                }
            }
        }
        
        // 從對象層創建遊戲對象
        if (objectsLayer) {
            const objects = objectsLayer.getObjects();
            
            for (const obj of objects) {
                const x = obj.x;
                const y = obj.y;
                
                switch (obj.name) {
                    case 'player_spawn':
                        this.playerSpawnPoint = cc.v2(x, y);
                        break;
                        
                    case 'goomba':
                        this.createEnemy(cc.v2(x, y), 0);
                        break;
                        
                    case 'turtle':
                        this.createEnemy(cc.v2(x, y), 1);
                        break;
                        
                    case 'question_block':
                        this.createQuestionBlock(cc.v2(x, y), obj.properties);
                        break;
                        
                    case 'end_flag':
                        this.createEndFlag(cc.v2(x, y));
                        break;
                }
            }
        }
    }
    
    // 創建默認地圖
    private createDefaultMap() {
        // 創建地面
        const ground = new cc.Node("ground");
        ground.group = "ground";
        
        ground.setPosition(0, -320);
        
        const groundBody = ground.addComponent(cc.RigidBody);
        groundBody.type = cc.RigidBodyType.Static;
        
        const groundCollider = ground.addComponent(cc.PhysicsBoxCollider);
        groundCollider.size = cc.size(2000, 50);
        groundCollider.offset = cc.v2(0, 0);
        groundCollider.sensor = false;
        
        this.node.addChild(ground);
        
        // 創建一些平台
        for (let i = 0; i < 5; i++) {
            const platform = new cc.Node("platform");
            platform.group = "ground";
            
            platform.setPosition(i * 200 - 400, -200 + Math.sin(i) * 50);
            
            const platformBody = platform.addComponent(cc.RigidBody);
            platformBody.type = cc.RigidBodyType.Static;
            
            const platformCollider = platform.addComponent(cc.PhysicsBoxCollider);
            platformCollider.size = cc.size(150, 30);
            platformCollider.offset = cc.v2(0, 0);
            platformCollider.sensor = false;
            
            this.node.addChild(platform);
        }
        
        // 創建幾個問號方塊
        this.createQuestionBlock(cc.v2(-300, 0), { itemType: 'coin' });
        this.createQuestionBlock(cc.v2(-250, 0), { itemType: 'mushroom' });
        this.createQuestionBlock(cc.v2(-200, 0), { itemType: 'coin' });
        
        // 創建一些敵人
        this.createEnemy(cc.v2(100, -280), 0);
        this.createEnemy(cc.v2(300, -280), 0);
        this.createEnemy(cc.v2(500, -280), 1);
        
        // 設置玩家出生點
        this.playerSpawnPoint = cc.v2(-350, -250);
        
        // 創建終點旗幟
        this.createEndFlag(cc.v2(900, -250));
    }
      // 創建玩家
    private createPlayer() {
        if (this.playerPrefab) {
            this.player = cc.instantiate(this.playerPrefab);
            this.player.group = 'player';
            
            // 默認生成點為初始位置
            this.playerSpawnPoint = cc.v2(0, 100);
            this.player.setPosition(this.playerSpawnPoint);
            
            this.node.addChild(this.player);
        }
    }
    
    // 創建敵人
    private createEnemy(pos: cc.Vec2, type: number) {
        if (this.enemyPrefabs && this.enemyPrefabs[type]) {
            const enemy = cc.instantiate(this.enemyPrefabs[type]);
            enemy.group = 'enemy';
            enemy.setPosition(pos);
            this.node.addChild(enemy);
        }
    }
    
    // 創建問號方塊
    private createQuestionBlock(pos: cc.Vec2, properties: any) {
        if (this.blockPrefab) {
            const block = cc.instantiate(this.blockPrefab);
            block.group = 'questionBlock';
            block.setPosition(pos);
            
            // 設置方塊屬性
            const blockComp = block.getComponent('QuestionBlock');
            if (blockComp && properties) {
                if (properties.itemType) {
                    switch (properties.itemType) {
                        case 'coin':
                            blockComp.itemType = blockComp.BlockItemType.COIN;
                            break;
                        case 'mushroom':
                            blockComp.itemType = blockComp.BlockItemType.MUSHROOM;
                            blockComp.itemPrefab = this.mushRoomPrefab;
                            break;
                        case 'star':
                            blockComp.itemType = blockComp.BlockItemType.STAR;
                            break;
                        case 'flower':
                            blockComp.itemType = blockComp.BlockItemType.FLOWER;
                            break;
                        case 'multi_coin':
                            blockComp.itemType = blockComp.BlockItemType.MULTI_COIN;
                            blockComp.coinCount = properties.coinCount || 10;
                            break;
                    }
                }
            }
            
            this.node.addChild(block);
        }
    }
    
    // 創建終點旗幟
    private createEndFlag(pos: cc.Vec2) {
        const flag = new cc.Node("end_flag");
        flag.group = "endFlag";
        flag.setPosition(pos);
        
        const flagCollider = flag.addComponent(cc.BoxCollider);
        flagCollider.size = cc.size(10, 200);
        flagCollider.offset = cc.v2(0, 100);
        
        // 添加旗幟碰撞事件
        const flagSensor = flag.addComponent(cc.RigidBody);
        flagSensor.type = cc.RigidBodyType.Static;
        
        const flagPhysicsCollider = flag.addComponent(cc.PhysicsBoxCollider);
        flagPhysicsCollider.size = cc.size(10, 200);
        flagPhysicsCollider.offset = cc.v2(0, 100);
        flagPhysicsCollider.sensor = true;
        
        // 註冊碰撞事件處理
        flag.once(cc.Node.EventType.TOUCH_START, () => {
            this.onFlagReached();
        });
        
        this.node.addChild(flag);
    }
    
    // 創建相機
    private createCamera() {
        const cameraNode = new cc.Node('GameCamera');
        this.camera = cameraNode.addComponent(cc.Camera);
        this.camera.cullingMask = 0xffffffff;
        
        this.node.addChild(cameraNode);
        
        // 將相機定位在玩家上方
        if (this.player) {
            cameraNode.setPosition(this.player.getPosition());
        }
    }
    
    // 更新相機
    private updateCamera() {
        if (!this.camera || !this.player) {
            return;
        }
        
        // 讓相機追蹤玩家
        const targetPos = this.player.getPosition();
        const currentPos = this.camera.node.getPosition();
        
        // 平滑過渡
        const newPos = cc.v2(
            cc.misc.lerp(currentPos.x, targetPos.x, 0.1),
            cc.misc.lerp(currentPos.y, targetPos.y + 100, 0.1)
        );
        
        // 相機邊界限制
        const minX = -960 / 2;
        const maxX = 2000; // 根據實際地圖長度調整
        
        newPos.x = cc.misc.clampf(newPos.x, minX, maxX);
        
        this.camera.node.setPosition(newPos);
    }
    
    // 初始化UI
    private initUI() {
        // 更新分數、生命和計時器顯示
        this.updateUI();
        
        // 隱藏暫停選單
        if (this.pauseUI) {
            this.pauseUI.active = false;
        }
    }
    
    // 更新UI
    private updateUI() {
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (!gameManager) return;
        
        // 更新分數
        if (this.scoreLabel) {
            this.scoreLabel.string = `分數: ${gameManager.playerScore}`;
        }
        
        // 更新生命值
        if (this.lifeLabel) {
            this.lifeLabel.string = `生命: ${gameManager.playerLives}`;
        }
        
        // 更新計時器
        if (this.timerLabel) {
            this.timerLabel.string = `時間: ${gameManager.remainingTime}`;
        }
    }
    
    // 更新計時器
    private updateTimer() {
        if (this.isPaused || this.isGameOver || this.isLevelClear) {
            return;
        }
        
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (!gameManager) return;
        
        gameManager.remainingTime--;
        
        // 更新UI
        this.updateUI();
        
        // 檢查時間是否用盡
        if (gameManager.remainingTime <= 0) {
            this.gameOver();
        }
    }
    
    // 鍵盤按下事件
    private onKeyDown(event) {
        switch(event.keyCode) {
            case cc.macro.KEY.escape:
            case cc.macro.KEY.p:
                this.togglePause();
                break;
        }
    }
    
    // 切換暫停狀態
    private togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.pauseUI) {
            this.pauseUI.active = this.isPaused;
        }
        
        if (this.isPaused) {
            cc.game.pause();
        } else {
            cc.game.resume();
        }
    }
    
    // 檢查關卡結束
    private checkLevelClear() {
        // 這裡可以添加更多的結束條件
    }
    
    // 到達終點旗幟
    private onFlagReached() {
        if (this.isLevelClear || this.isGameOver) {
            return;
        }
        
        this.isLevelClear = true;
        
        // 播放關卡通關音效
        if (this.levelClearSound) {
            cc.audioEngine.playEffect(this.levelClearSound, false);
        }
        
        // 停止背景音樂
        cc.audioEngine.stopMusic();
        
        // 向玩家添加時間獎勵分數
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (gameManager) {
            gameManager.addScore(gameManager.remainingTime * 10);
            gameManager.completeLevel();
        }
    }
      // 遊戲結束
    private gameOver() {
        this.isGameOver = true;
        
        // 播放遊戲結束音效
        if (this.gameOverSound) {
            cc.audioEngine.playEffect(this.gameOverSound, false);
        }
        
        // 停止背景音樂
        cc.audioEngine.stopMusic();
        
        // 顯示遊戲結束UI
        // ...
        
        // 通知遊戲管理器
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (gameManager) {
            gameManager.gameOver();
        }
    }
    
    // 獲取玩家節點
    public getPlayerNode(): cc.Node {
        return this.player;
    }
    
    onDestroy() {
        // 取消事件監聽
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        
        // 停止計時器
        this.unschedule(this.updateTimer);
        
        // 停止音樂
        cc.audioEngine.stopMusic();
    }
}
