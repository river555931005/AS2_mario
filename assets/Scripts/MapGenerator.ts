/**
 * 地圖生成器
 * 負責創建和管理遊戲地圖
 */

// 導入問號方塊的物品類型枚舉
import { BlockItemType } from './QuestionBlock';

const {ccclass, property} = cc._decorator;

@ccclass
export default class MapGenerator extends cc.Component {
    
    // 預設資源
    @property(cc.Prefab)
    private groundTilePrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private brickTilePrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private questionBlockPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private pipePrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private goombaPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private turtlePrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private flowerPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private flagPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private coinPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private mushroomPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private starPrefab: cc.Prefab = null;
    
    // 地圖參數
    @property(cc.Integer)
    private mapWidth: number = 100;
    
    @property(cc.Integer)
    private mapHeight: number = 15;
    
    @property(cc.Integer)
    private tileSize: number = 32;
    
    // 私有變量
    private mapNode: cc.Node = null;
      onLoad() {
        // 創建地圖容器節點
        this.mapNode = new cc.Node('Map');
        this.node.addChild(this.mapNode);
        
        // 初始化地圖
        this.initMap();
        
        // 設置玩家位置
        this.setupPlayerPosition();
    }
    
    // 設置玩家位置
    private setupPlayerPosition() {
        const gameController = this.node.parent.getComponent('GameController');
        const player = gameController ? gameController.getPlayerNode() : null;
        
        if (player) {
            // 尋找合適的出生點（假設是第一關卡第二行的第3個位置）
            const spawnPosition = cc.v2(3 * this.tileSize, (this.mapHeight - 2) * this.tileSize);
            player.setPosition(spawnPosition);
        }
    }
    
    start() {
        
    }
    
    // 初始化地圖
    private initMap() {
        const level = this.getLevel();
        
        if (level && level.length > 0) {
            this.createMapFromArray(level);
        } else {
            this.createDefaultMap();
        }
    }
      // 從數組創建地圖
    private createMapFromArray(levelData: string[]) {
        const height = levelData.length;
        const width = levelData[0].length;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileType = levelData[y].charAt(x);
                this.createTile(tileType, x, height - y - 1);
            }
        }
        
        // 設置地圖大小
        this.mapWidth = width;
        this.mapHeight = height;
    }
    
    // 創建一個默認的測試地圖
    private createDefaultMap() {
        // 創建地面
        for (let x = 0; x < this.mapWidth; x++) {
            this.createTile('G', x, 0); // 地面
            
            // 在某些地方創建管道
            if (x % 20 === 10) {
                this.createTile('P', x, 1);
                this.createTile('P', x, 2);
            }
            
            // 創建一些磚塊和問號方塊
            if (x % 5 === 0 && x > 10) {
                this.createTile('B', x, 4); // 磚塊
            } else if (x % 7 === 0 && x > 15) {
                this.createTile('Q', x, 4); // 問號方塊
            }
            
            // 創建一些敵人
            if (x % 15 === 5 && x > 20) {
                this.createTile('E', x, 1); // 敵人
            }
        }
        
        // 在地圖最後放置旗幟
        this.createTile('F', this.mapWidth - 5, 1);
    }
    
    // 創建一個瓦片
    private createTile(type: string, x: number, y: number) {
        let tile: cc.Node = null;
        let prefab: cc.Prefab = null;
        let group = '';
        
        switch (type) {
            case 'G': // 地面
            case 'g':
                prefab = this.groundTilePrefab;
                group = 'ground';
                break;
                
            case 'B': // 磚塊
            case 'b':
                prefab = this.brickTilePrefab;
                group = 'brick'; // 改為 'brick' 以區別於地面
                break;
                
            case 'Q': // 問號方塊
            case 'q':
                prefab = this.questionBlockPrefab;
                group = 'questionBlock'; // 保持與 QuestionBlock.ts 中的一致
                break;
                
            case 'P': // 管道
            case 'p':
                prefab = this.pipePrefab;
                group = 'ground';
                break;
                
            case 'E': // 敵人(Goomba)
            case 'e':
                prefab = this.goombaPrefab;
                group = 'enemy';
                break;
                
            case 'T': // 烏龜
            case 't':
                prefab = this.turtlePrefab;
                group = 'enemy';
                break;
                
            case 'F': // 食人花
            case 'f':
                prefab = this.flowerPrefab;
                group = 'enemy';
                break;
                
            case 'C': // 硬幣
            case 'c':
                prefab = this.coinPrefab;
                group = 'item';
                break;
                
            case 'M': // 蘑菇
            case 'm':
                prefab = this.mushroomPrefab;
                group = 'item';
                break;
                
            case 'S': // 星星
            case 's':
                prefab = this.starPrefab;
                group = 'item';
                break;
                
            case 'Z': // 終點旗幟
            case 'z':
                prefab = this.flagPrefab;
                group = 'flag';
                break;
                
            default:
                return; // 空白或未知類型
        }
        
        // 如果找到對應的預製體，創建節點
        if (prefab) {
            tile = cc.instantiate(prefab);
            tile.group = group;
            tile.setPosition(x * this.tileSize, y * this.tileSize);
            
            // 為不同類型的物體設置不同的屬性
            switch (type) {
                case 'Q':
                case 'q':
                    // 設置問號方塊的內容
                    const blockComp = tile.getComponent('QuestionBlock');
                    if (blockComp) {
                        // 根據位置隨機決定方塊內容
                        const random = Math.random();
                        if (random < 0.7) {
                            // 硬幣類型
                            blockComp.itemType = BlockItemType.COIN;
                            blockComp.coinPrefab = this.coinPrefab;
                        } else if (random < 0.9) {
                            // 蘑菇類型
                            blockComp.itemType = BlockItemType.MUSHROOM;
                            blockComp.mushroomPrefab = this.mushroomPrefab;
                        } else {
                            // 星星類型
                            blockComp.itemType = BlockItemType.STAR;
                            blockComp.starPrefab = this.starPrefab;
                        }
                    }
                    break;
            }
            
            this.mapNode.addChild(tile);
        }
    }
      // 獲取當前關卡數據
    private getLevel(): string[] {
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (!gameManager) return null;
        
        const world = gameManager.currentWorld;
        const level = gameManager.currentLevel;
        
        // 根據世界和關卡返回對應的關卡數據
        return this.getLevelData(world, level);
    }
    
    // 獲取指定世界和關卡的數據
    private getLevelData(world: number, level: number): string[] {
        // 這裡可以擴展為從配置文件或服務器加載關卡數據
        
        // 示例關卡: 第一世界第一關
        if (world === 1 && level === 1) {
            return [
                '                                                                                                ',
                '                                                                                                ',
                '                                                                                                ',
                '                            Q     B     Q     B                                                 ',
                '                                                                                                ',
                '                                                            BBBBBBBBBBBBBB                      ',
                '                   Q                                                                            ',
                '                                                                                              Z ',
                '                                                Q                                               ',
                '                                                                                                ',
                '                      E       E                       T      T                                  ',
                '                                          P                                                     ',
                '                                          P                                                     ',
                'GGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
                'GGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
            ];
        }
        
        // 示例關卡: 第一世界第二關
        else if (world === 1 && level === 2) {
            return [
                '                                                                                                ',
                '                                                                                                ',
                '                 S                                                                              ',
                '                                                                                                ',
                '                       BBBQBBB                                                                  ',
                '         BQBQBQB                                            BBBBBBBBBBBBBB                      ',
                '                                                                                                ',
                '                                                                                              Z ',
                '                                                Q                                               ',
                '                                                                                                ',
                '                      E       E                       T      T      F                           ',
                '                                          P                                                     ',
                '                                          P           P                                         ',
                'GGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
                'GGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGG    GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
            ];
        }
        
        // 默認返回一個簡單的測試地圖
        return [
            '                                                ',
            '                                                ',
            '                                                ',
            '                                                ',
            '                Q   B   Q                       ',
            '                                                ',
            '                                                ',
            '                                              Z ',
            '                                                ',
            '                                                ',
            '        E                   T                   ',
            '                                                ',
            'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
            'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
        ];
    }
}
