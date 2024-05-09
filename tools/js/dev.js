/**
 * Convert modeldata.csv to modeldata.json
 * Header: 
 *  m_ID,m_flags,m_modelName,m_sizeClass,m_modelScale,m_bloodID,m_footprintTextureID,
 *  m_footprintTextureLength,m_footprintTextureWidth,m_footprintParticleScale,m_foleyMaterialID,
 *  m_footstepShakeSize,m_deathThudShakeSize,m_soundID,m_collisionWidth,m_collisionHeight,m_mountHeight,
 *  m_geoBoxMinX,m_geoBoxMinY,m_geoBoxMinZ,m_geoBoxMaxX,m_geoBoxMaxY,m_geoBoxMaxZ,m_worldEffectScale,m_attachedEffectScale,
 *  m_missileCollisionRadius,m_missileCollisionPush,m_missileCollisionRaise
 */

var modeldata_header = [
    "m_ID", "m_flags", "m_modelName", "m_sizeClass", "m_modelScale", "m_bloodID", "m_footprintTextureID",
    "m_footprintTextureLength", "m_footprintTextureWidth", "m_footprintParticleScale", "m_foleyMaterialID",
    "m_footstepShakeSize", "m_deathThudShakeSize", "m_soundID", "m_collisionWidth", "m_collisionHeight",
    "m_mountHeight", "m_geoBoxMinX", "m_geoBoxMinY", "m_geoBoxMinZ", "m_geoBoxMaxX", "m_geoBoxMaxY", "m_geoBoxMaxZ", 
    "m_worldEffectScale", "m_attachedEffectScale", "m_missileCollisionRadius", "m_missileCollisionPush", "m_missileCollisionRaise"
]

$('#cmd-convert').on('click', () => {
    // Get value and delete quote
    var csv = $('#cmd-csv').val().replace(/"/g, "");
    var lines = csv.split('\n');
    var data = [];
    for (var i = 0; i < lines.length; i++) {
        var record = {};
        var values = lines[i].split(',');
        if (values.length != modeldata_header.length) {
            $('#cmd-json').val('Your data length doesn\'t match CreatureModelData header length');
            return;
        }
        for (var j = 0; j < values.length; j++) {
            record[modeldata_header[j]] = values[j];
        }
        data.push(record);
    }
    $('#cmd-json').val(JSON.stringify(data));
})

/**
 * Convert displaydata.csv to displaydata.json
 * Header:  
 *  m_ID,m_modelID,m_soundID,m_extendedDisplayInfoID,m_creatureModelScale,m_creatureModelAlpha,
 *  m_textureVariation_1,m_textureVariation_2,m_textureVariation_3,m_portraitTextureName,m_bloodLevel,
 *  m_bloodID,m_npcSoundID,m_particleColorID,m_creatureGeosetData,m_objectEffectPackageID
 * */

var displaydata_header = [
    "m_ID", "m_modelID", "m_soundID", "m_extendedDisplayInfoID", "m_creatureModelScale", "m_creatureModelAlpha",
    "m_textureVariation_1", "m_textureVariation_2", "m_textureVariation_3", "m_portraitTextureName", "m_bloodLevel",
    "m_bloodID", "m_npcSoundID", "m_particleColorID", "m_creatureGeosetData", "m_objectEffectPackageID"
]

$('#cdi-convert').on('click', () => {
    var csv = $('#cdi-csv').val().replace(/"/g, "");
    var lines = csv.split('\n');
    var data = [];
    for (var i = 0; i < lines.length; i++) {
        var record = {};
        var values = lines[i].split(',');
        if (values.length !== displaydata_header.length) {
            $('#cdi-json').val('Your data length doesn\'t match CreatureDisplayInfo header length');
            return;
        }
        for (var j = 0; j < values.length; j++) {
            record[displaydata_header[j]] = values[j];
        }
        data.push(record);
    }
    $('#cdi-json').val(JSON.stringify(data));
})

// Select all text on focus in textarea
$('textarea').on('focus', function() {
    this.select();
})