'use strict';
var validateI3dm = require('../../lib/validateI3dm');
var specUtility = require('./specUtility.js');

var createI3dm = specUtility.createI3dm;

describe('validate i3dm', function() {
    it ('returns error message if the i3dm buffer\'s byte length is less than its header length', function() {
        expect(validateI3dm(Buffer.alloc(0))).toBe('Header must be 32 bytes.');
    });

    it('returns error message if the i3dm has invalid magic', function() {
        var i3dm = createI3dm();
        i3dm.write('xxxx', 0);
        expect(validateI3dm(i3dm)).toBe('Invalid magic: xxxx');
    });

    it('returns error message if the i3dm has an invalid version', function() {
        var i3dm = createI3dm();
        i3dm.writeUInt32LE(10, 4);
        expect(validateI3dm(i3dm)).toBe('Invalid version: 10. Version must be 1.');
    });

    it('returns error message if the i3dm has wrong byteLength', function() {
        var i3dm = createI3dm();
        i3dm.writeUInt32LE(0, 8);
        var message = validateI3dm(i3dm);
        expect(message).toBeDefined();
        expect(message.indexOf('byteLength of 0 does not equal the tile\'s actual byte length of') === 0).toBe(true);
    });

    it('returns error message if the feature table binary is not aligned to an 8-byte boundary', function() {
        var i3dm = createI3dm({
            unalignedFeatureTableBinary : true
        });
        expect(validateI3dm(i3dm)).toBe('Feature table binary must be aligned to an 8-byte boundary.');
    });

    it('returns error message if the batch table binary is not aligned to an 8-byte boundary', function() {
        var i3dm = createI3dm({
            unalignedBatchTableBinary : true
        });
        expect(validateI3dm(i3dm)).toBe('Batch table binary must be aligned to an 8-byte boundary.');
    });

    it('returns error message if the glb is not aligned to an 8-byte boundary', function() {
        var i3dm = createI3dm({
            unalignedGlb : true
        });
        expect(validateI3dm(i3dm)).toBe('Glb must be aligned to an 8-byte boundary.');
    });

    it('returns error message if the byte lengths in the header exceed the tile\'s byte length', function() {
        var i3dm = createI3dm();
        i3dm.writeUInt32LE(128, 12);
        expect(validateI3dm(i3dm)).toBe('Feature table, batch table, and glb byte lengths exceed the tile\'s byte length.');
    });

    it('returns error message if feature table JSON could not be parsed: ', function() {
        var i3dm = createI3dm();
        var charCode = '!'.charCodeAt(0);
        i3dm.writeUInt8(charCode, 32); // Replace '{' with '!'
        expect(validateI3dm(i3dm)).toBe('Feature table JSON could not be parsed: Unexpected token ! in JSON at position 0');
    });

    it('returns error message if batch table JSON could not be parsed: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0]
            },
            batchTableJson : {
                height : [0.0]
            }
        });
        var featureTableJsonByteLength = i3dm.readUInt32LE(12);
        var featureTableBinaryByteLength = i3dm.readUInt32LE(16);
        var batchTableJsonByteOffset = 32 + featureTableJsonByteLength + featureTableBinaryByteLength;
        var charCode = '!'.charCodeAt(0);
        i3dm.writeUInt8(charCode, batchTableJsonByteOffset); // Replace '{' with '!'
        expect(validateI3dm(i3dm)).toBe('Batch table JSON could not be parsed: Unexpected token ! in JSON at position 0');
    });

    it('returns error message if feature table does not contain an INSTANCES_LENGTH property: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                POSITION : [0, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table must contain an INSTANCES_LENGTH property.');
    });

    it('returns error message if feature table does not contain either POSITION or POSITION_QUANTIZED properties: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table must contain either the POSITION or POSITION_QUANTIZED property.');
    });

    it('returns error message if feature table has a NORMAL_UP property but not a NORMAL_RIGHT property: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0],
                NORMAL_UP : [1, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table property NORMAL_RIGHT is required when NORMAL_UP is present.');
    });

    it('returns error message if feature table has a NORMAL_RIGHT property but not a NORMAL_UP property: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0],
                NORMAL_RIGHT : [1, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table property NORMAL_UP is required when NORMAL_RIGHT is present.');
    });

    it('returns error message if feature table has a NORMAL_UP_OCT32P property but not a NORMAL_RIGHT_OCT32P property: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0],
                NORMAL_UP_OCT32P : [1, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table property NORMAL_RIGHT_OCT32P is required when NORMAL_UP_OCT32P is present.');
    });

    it('returns error message if feature table has a NORMAL_RIGHT_OCT32P property but not a NORMAL_UP_OCT32P property: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0],
                NORMAL_RIGHT_OCT32P : [1, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table property NORMAL_UP_OCT32P is required when NORMAL_RIGHT_OCT32P is present.');
    });

    it('returns error message if feature table has a POSITION_QUANTIZED property but not QUANTIZED_VOLUME_OFFSET and QUANTIZED_VOLUME_SCALE: ', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION_QUANTIZED : [0, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBe('Feature table properties QUANTIZED_VOLUME_OFFSET and QUANTIZED_VOLUME_SCALE are required when POSITION_QUANTIZED is present.');
    });

    it('returns error message if feature table is invalid', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0],
                INVALID : 0
            }
        });
        expect(validateI3dm(i3dm)).toBe('Invalid feature table property "INVALID".');
    });

    it('returns error message if batch table is invalid', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0]
            },
            batchTableJson : {
                height : {
                    byteOffset : 0,
                    type : 'SCALAR',
                    componentType : 'FLOAT'
                }
            }
        });

        expect(validateI3dm(i3dm)).toBe('Batch table binary property "height" exceeds batch table binary byte length.');
    });

    it('succeeds for valid i3dm', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : [0, 0, 0]
            }
        });
        expect(validateI3dm(i3dm)).toBeUndefined();
    });

    it('succeeds for valid i3dm with a feature table binary', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : {
                    byteOffset : 0
                },
                POSITION : {
                    byteOffset : 4
                }
            },
            featureTableBinary : Buffer.alloc(16)
        });
        expect(validateI3dm(i3dm)).toBeUndefined();
    });

    it('succeeds for valid i3dm with a batch table', function() {
        var i3dm = createI3dm({
            featureTableJson : {
                INSTANCES_LENGTH : 1,
                POSITION : {
                    byteOffset : 0
                }
            },
            featureTableBinary : Buffer.alloc(12),
            batchTableJson : {
                height : {
                    byteOffset : 0,
                    type : 'SCALAR',
                    componentType : 'FLOAT'
                }
            },
            batchTableBinary : Buffer.alloc(4)
        });
        expect(validateI3dm(i3dm)).toBeUndefined();
    });
});