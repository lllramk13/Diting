CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION pg_partman;

CREATE TABLE IF NOT EXISTS ships (
    mmsi INTEGER PRIMARY KEY,              -- 船只唯一标识
    imo INTEGER,                           -- 船舶终身识别码
    name VARCHAR(128),                     -- 船名
    call_sign VARCHAR(32),                 -- 呼号
    ship_type SMALLINT,                    -- 船舶类型代码

    dimension_to_bow SMALLINT,             -- 距船首距离
    dimension_to_stern SMALLINT,           -- 距船尾距离
    dimension_to_port SMALLINT,            -- 距左舷距离
    dimension_to_starboard SMALLINT,       -- 距右舷距离
    max_draught REAL,                      -- 最大吃水深度

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sar_aircrafts (
    mmsi INTEGER PRIMARY KEY,              -- 飞机 MMSI
    name VARCHAR(128),                     -- 呼号或名称
    equipment_type SMALLINT,               -- 设备类型
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS base_stations (
    mmsi INTEGER PRIMARY KEY,              -- 基站的 MMSI
    
    location GEOMETRY(Point, 4326),        -- 基站的物理坐标
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_base_stations_location ON base_stations USING GIST (location);

CREATE TABLE IF NOT EXISTS aids_to_navigation (
    mmsi INTEGER PRIMARY KEY,              -- 航标 MMSI 识别码
    name VARCHAR(128),                     -- 航标名称
    aton_type SMALLINT,                    -- 航标类型代码
    location GEOMETRY(Point, 4326),        -- 航标的锚定/设定坐标
    
    is_virtual BOOLEAN DEFAULT FALSE,      -- 是否为虚拟航标？
    is_off_position BOOLEAN DEFAULT FALSE, -- 是否偏离位置
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_aton_location ON aids_to_navigation USING GIST (location);

CREATE TABLE IF NOT EXISTS voyage (
    voyage_id SERIAL PRIMARY KEY,          
    mmsi INTEGER,   
    
    departure_port VARCHAR(128),           -- 出发港口
    destination VARCHAR(128),              -- 目的地
    eta TIMESTAMP WITH TIME ZONE,          -- 预计到达时间
    draught REAL,                          -- 吃水深度

    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    end_time TIMESTAMP WITH TIME ZONE,                             
    
    is_active BOOLEAN DEFAULT TRUE,        -- 是否是当前正在进行的航次

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_voyage_destination ON voyage (destination);
CREATE INDEX IF NOT EXISTS idx_voyage_mmsi ON voyage (mmsi);

CREATE TABLE IF NOT EXISTS ship_positions (
    id BIGSERIAL, 
    mmsi INTEGER, 
    
    location GEOMETRY(Point, 4326),        
    
    sog REAL,                              -- 对地航速
    cog REAL,                              -- 对地航向
    true_heading SMALLINT,                 -- 船首真实朝向
    nav_status SMALLINT,                   -- 航行状态
    
    message_type VARCHAR(32),              -- 记录是 Class A 还是 Class B 信号
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL, 
    
    PRIMARY KEY (id, timestamp)            -- 分区表的主键必须包含分区键
) PARTITION BY RANGE (timestamp);

CREATE INDEX IF NOT EXISTS idx_positions_location ON ship_positions USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_positions_mmsi_time ON ship_positions (mmsi, timestamp DESC);

CREATE TABLE IF NOT EXISTS sar_aircraft_positions (
    id BIGSERIAL PRIMARY KEY,
    mmsi INTEGER,                          -- 飞机的 MMSI
    
    location GEOMETRY(Point, 4326),
    altitude INTEGER,                      -- 飞机特有的高度数据
    alt_from_baro BOOLEAN,                 -- 是否来自气压计
    sog REAL,                              
    cog REAL,                              
    
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sar_positions_location ON sar_aircraft_positions USING GIST (location);

CREATE TABLE IF NOT EXISTS marine_alerts (
    id SERIAL PRIMARY KEY,
    mmsi INTEGER,
    entity_type VARCHAR(16) DEFAULT 'vessel',  -- 'vessel', 'sar_aircraft', 'aid_to_nav'

    alert_type VARCHAR(64),                -- 'SAR_AIRCRAFT_SPOTTED', 'SAFETY_BROADCAST'
    
    location GEOMETRY(Point, 4326),        
    alert_text TEXT,                       
    
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE      
);

CREATE INDEX IF NOT EXISTS idx_alerts_location ON marine_alerts USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON marine_alerts (is_resolved) WHERE is_resolved = FALSE;

SELECT partman.create_parent(
    p_parent_table => 'public.ship_positions',
    p_control      => 'timestamp',
    p_interval     => '1 month',
    p_premake      => 2
);