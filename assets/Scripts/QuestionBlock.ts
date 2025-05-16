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
    
    @property(cc.Prefab)
    public itemPrefab: cc.Prefab = null;
    
    @property(cc.SpriteFrame)
    public activeFrame: cc.SpriteFrame = null;
    
    @property(cc.SpriteFrame)
    public inactiveFrame: cc.SpriteFrame = null;
    
    @property(cc.Animation)
    private anim: cc.Animation = null;
    
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
        
        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(32, 32);
            collider.offset = cc.v2(0, 0);
            collider.sensor = false;
            collider.tag = 1; // 標記為問號方塊
        }
        
        // 設置多重硬幣數量
        if (this.itemType === BlockItemType.MULTI_COIN) {
            this.remainingCoins = this.coinCount;
        }
        
        // 初始化動畫
        this.initAnimations();
    }
    
    start() {
        // 播放閃爍動畫
        if (this.isActive) {
            this.anim.play('block_active');
        }
    }
    
    // 初始化動畫
    private initAnimations() {
        // 創建動畫剪輯
        const activeClip = new cc.AnimationClip();
        activeClip.name = 'block_active';
        activeClip.wrapMode = cc.WrapMode.Loop;
        activeClip.duration = 0.8;
        activeClip.sample = 10;
        const hitClip = new cc.AnimationClip();
        hitClip.name = 'block_hit';
        hitClip.wrapMode = cc.WrapMode.Normal;
        hitClip.duration = 0.2;
        hitClip.sample = 10;
        
        // 添加動畫剪輯到動畫組件
        if (this.anim) {
            this.anim.addClip(activeClip);
            this.anim.addClip(hitClip);
        }
    }
    
    // 被擊中
    public hit() {
        if (!this.isActive) {
            return;
        }
        
        // 播放撞擊動畫
        this.anim.stop();
        this.anim.play('block_hit');
        
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
            case BlockItemType.MULTI_COIN:
                this.generateCoin();
                this.remainingCoins--;
                if (this.remainingCoins <= 0) {
                    this.deactivate();
                }
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
        // 設置硬幣圖像（需要資源）
        
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
        if (this.itemPrefab) {
            const mushroom = cc.instantiate(this.itemPrefab);
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
        // 與蘑菇類似，但行為不同
        if (this.itemAppearSound) {
            cc.audioEngine.playEffect(this.itemAppearSound, false);
        }
        
        // 創建星星
        if (this.itemPrefab) {
            const star = cc.instantiate(this.itemPrefab);
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
        // 與蘑菇類似，但行為不同
        if (this.itemAppearSound) {
            cc.audioEngine.playEffect(this.itemAppearSound, false);
        }
        
        // 創建火花
        if (this.itemPrefab) {
            const flower = cc.instantiate(this.itemPrefab);
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

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (!this.isActive) return;

        // 確認碰撞的對象是否為玩家
        if (otherCollider.node.group === 'player') {
            this.isActive = false;

            // 切換為非活動狀態的圖片
            this.sprite.spriteFrame = this.inactiveFrame;

            // 播放音效
            if (this.itemType === BlockItemType.COIN) {
                cc.audioEngine.playEffect(this.coinSound, false);
                GameManager.getInstance().addScore(100);
            } else {
                cc.audioEngine.playEffect(this.itemAppearSound, false);

                // 生成對應的物品
                const item = cc.instantiate(this.itemPrefab);
                item.setPosition(this.node.position.x, this.node.position.y + 32);
                this.node.parent.addChild(item);
            }

            // 如果是多硬幣方塊，減少硬幣數量
            if (this.itemType === BlockItemType.MULTI_COIN) {
                this.remainingCoins--;
                if (this.remainingCoins > 0) {
                    this.isActive = true;
                    this.sprite.spriteFrame = this.activeFrame;
                }
            }
        }
    }
}
