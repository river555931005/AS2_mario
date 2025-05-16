/**
 * 問號方塊控制器
 * 負責問號方塊的行為和動畫
 */

import GameManager from './GameManager';

const {ccclass, property} = cc._decorator;

// 將 BlockItemType enum 移到類別外部
export enum BlockItemType {
    COIN,
    MUSHROOM,
    STAR,
    FLOWER,
    MULTI_COIN
}

@ccclass
export default class QuestionBlock extends cc.Component {
    
    // 方塊類型
    @property({
        type: cc.Enum(BlockItemType)
    })
    public itemType: BlockItemType = BlockItemType.COIN;
    
    @property(cc.Integer)
    public coinCount: number = 1;
    
    // 為不同物品類型添加獨立的預製體
    @property({
        type: cc.Prefab,
        tooltip: '硬幣預製體',
        visible: function(this: QuestionBlock) {
            return this.itemType === BlockItemType.COIN || this.itemType === BlockItemType.MULTI_COIN;
        }
    })
    public coinPrefab: cc.Prefab = null;
    
    @property({
        type: cc.Prefab,
        tooltip: '蘑菇預製體',
        visible: function(this: QuestionBlock) {
            return this.itemType === BlockItemType.MUSHROOM;
        }
    })
    public mushroomPrefab: cc.Prefab = null;
    
    @property({
        type: cc.Prefab,
        tooltip: '星星預製體',
        visible: function(this: QuestionBlock) {
            return this.itemType === BlockItemType.STAR;
        }
    })
    public starPrefab: cc.Prefab = null;
    
    @property({
        type: cc.Prefab,
        tooltip: '花朵預製體',
        visible: function(this: QuestionBlock) {
            return this.itemType === BlockItemType.FLOWER;
        }
    })
    public flowerPrefab: cc.Prefab = null;
    
    @property(cc.SpriteFrame)
    public activeFrame: cc.SpriteFrame = null;
    
    @property(cc.SpriteFrame)
    public inactiveFrame: cc.SpriteFrame = null;
    
    @property(cc.Animation)
    private anim: cc.Animation = null;
    
    @property(cc.SpriteFrame)
    private coinSpriteFrame: cc.SpriteFrame = null;
    
    // 音效
    @property(cc.AudioClip)
    private coinSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private itemAppearSound: cc.AudioClip = null;
    
    // 私有屬性
    private isActive: boolean = true;
    private remainingCoins: number = 0;
    private sprite: cc.Sprite = null;
    
    onLoad() {
        // 獲取組件
        this.sprite = this.getComponent(cc.Sprite);
        
        // 設置碰撞組和邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(32, 32);
            collider.offset = cc.v2(0, 0);
            collider.sensor = false;
            // 使用組名而不是標籤
            this.node.group = 'questionBlock';
        }
        
        // 設置多重硬幣數量
        if (this.itemType === BlockItemType.MULTI_COIN) {
            this.remainingCoins = this.coinCount;
        }
    }
    
    start() {
        // 檢查是否有預設的動畫剪輯
        if (this.anim && this.isActive) {
            // 使用編輯器中創建的動畫
            if (this.anim.getClips().length > 0) {
                this.anim.play();
            } else {
                cc.warn('問號方塊缺少動畫剪輯，請在編輯器中創建');
            }
        }
    }
    
    // 被擊中
    public hit() {
        if (!this.isActive) {
            return;
        }
        
        // 播放撞擊動畫
        if (this.anim) {
            this.anim.stop();
            
            // 檢查是否有 block_hit 動畫
            const hitClip = this.anim.getClips().find(clip => clip.name === 'block_hit');
            if (hitClip) {
                this.anim.play('block_hit');
            }
        }
        
        // 產生對應物品
        this.generateItem();
        
        // 如果是多重硬幣，檢查剩餘數量
        if (this.itemType === BlockItemType.MULTI_COIN) {
            this.remainingCoins--;
            if (this.remainingCoins <= 0) {
                this.deactivate();
            }
        } else {
            // 其他類型的方塊只能使用一次
            this.deactivate();
        }
    }
    
    // 修正 generateItem 方法
    private generateItem() {
        switch (this.itemType) {
            case BlockItemType.COIN:
            case BlockItemType.MULTI_COIN:  // MULTI_COIN 和 COIN 使用相同邏輯
                this.generateCoin();
                break;
            case BlockItemType.MUSHROOM:
                this.generateMushroom();
                break;
            case BlockItemType.STAR:
                this.generateStar();
                break;
            case BlockItemType.FLOWER:
                this.generateFlower();
                break;
        }
    }
    
    // 產生硬幣
    private generateCoin() {
        // 播放硬幣音效
        if (this.coinSound) {
            cc.audioEngine.playEffect(this.coinSound, false);
        }
        
        // 硬幣動畫效果
        const coinNode = new cc.Node('Coin');
        coinNode.setPosition(cc.v2(0, 20));
        
        // 添加 Sprite 組件
        const coinSprite = coinNode.addComponent(cc.Sprite);
        
        // 設置硬幣圖像
        if (this.coinSpriteFrame) {
            coinSprite.spriteFrame = this.coinSpriteFrame;
        } else if (this.coinPrefab) {
            // 如果有硬幣預製體但沒有直接的 SpriteFrame，嘗試從預製體獲取
            const tempCoin = cc.instantiate(this.coinPrefab);
            const tempSprite = tempCoin.getComponent(cc.Sprite);
            if (tempSprite && tempSprite.spriteFrame) {
                coinSprite.spriteFrame = tempSprite.spriteFrame;
            }
            tempCoin.destroy();
        }
        
        // 添加動畫效果
        this.node.addChild(coinNode);
        
        cc.tween(coinNode)
            .to(0.2, { position: cc.v3(0, 60, 0), scale: 1.2, opacity: 255 })
            .to(0.1, { scale: 1.0 })
            .to(0.2, { position: cc.v3(0, 80, 0), opacity: 0 })
            .call(() => {
                coinNode.destroy();
                
                // 增加分數
                const gameManager = cc.find('GameManager').getComponent('GameManager');
                if (gameManager) {
                    gameManager.addScore(200);
                }
            })
            .start();
    }
    
    // 產生蘑菇
    private generateMushroom() {
        // 播放物品出現音效
        if (this.itemAppearSound) {
            cc.audioEngine.playEffect(this.itemAppearSound, false);
        }
        
        // 創建蘑菇
        if (this.mushroomPrefab) {
            const mushroom = cc.instantiate(this.mushroomPrefab);
            mushroom.setPosition(cc.v2(0, 16));
            this.node.parent.addChild(mushroom);
            
            // 向上移動動畫
            cc.tween(mushroom)
                .to(0.5, { y: mushroom.y + 32 })
                .call(() => {
                    // 設置蘑菇的物理屬性和行為
                    const itemComponent = mushroom.getComponent('Item');
                    if (itemComponent) {
                        itemComponent.activate();
                    }
                })
                .start();
        }
    }
    
    // 產生星星
    private generateStar() {
        if (this.itemAppearSound) {
            cc.audioEngine.playEffect(this.itemAppearSound, false);
        }
        
        // 創建星星
        if (this.starPrefab) {
            const star = cc.instantiate(this.starPrefab);
            star.setPosition(cc.v2(0, 16));
            this.node.parent.addChild(star);
            
            cc.tween(star)
                .to(0.5, { y: star.y + 32 })
                .call(() => {
                    const itemComponent = star.getComponent('Item');
                    if (itemComponent) {
                        itemComponent.activate();
                    }
                })
                .start();
        }
    }
    
    // 產生火花
    private generateFlower() {
        if (this.itemAppearSound) {
            cc.audioEngine.playEffect(this.itemAppearSound, false);
        }
        
        // 創建火花
        if (this.flowerPrefab) {
            const flower = cc.instantiate(this.flowerPrefab);
            flower.setPosition(cc.v2(0, 16));
            this.node.parent.addChild(flower);
            
            cc.tween(flower)
                .to(0.5, { y: flower.y + 32 })
                .call(() => {
                    const itemComponent = flower.getComponent('Item');
                    if (itemComponent) {
                        itemComponent.activate();
                    }
                })
                .start();
        }
    }
    
    // 修正 deactivate 方法
    private deactivate() {
        this.isActive = false;

        // 停止動畫
        if (this.anim) {
            this.anim.stop();
        }

        // 更改外觀
        if (this.sprite && this.inactiveFrame) {
            this.sprite.spriteFrame = this.inactiveFrame;
        }
    }

    // 修正碰撞處理邏輯
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (!this.isActive) return;

        // 確認碰撞的對象是否為玩家
        if (otherCollider.node.group === 'player') {
            // 檢查玩家是否從下方撞擊方塊
            const playerBody = otherCollider.node.getComponent(cc.RigidBody);
            if (playerBody && playerBody.linearVelocity.y > 0) { // 玩家向上跳
                // 檢查碰撞點位置
                const manifold = contact.getWorldManifold();
                if (manifold && manifold.normal) {
                    const normal = manifold.normal; // 碰撞法線
                    if (normal.y < -0.7) { // 法線朝下，表示玩家從下方撞擊
                        this.hit(); // 呼叫 hit 方法處理方塊行為
                    }
                }
            }
        }
    }
}
