const mongoose = require('mongoose');

const ProductSynchronizer = require(`@services/ProductSynchronizer`);
const SlFactory = require('../factories/SlFactory');

describe('#execute', () => {
  let product;
  let subject;
  let productInfo;
  let sychronizer;
  let productId;

  beforeEach(async () => {
    productId = new mongoose.Types.ObjectId();

    subject = async () => {
      sychronizer = new ProductSynchronizer(productId);
      jest.spyOn(OpenApiClient, 'request').mockResolvedValue(productInfo);
      await sychronizer.execute();
      return Product.findOne({ _id: product._id });
    };
  });

  describe('product removed', () => {
    beforeEach(async () => {
      product = await SlFactory.create('Product', { productId });
      productInfo = {
        status: 'removed',
      };
    });

    test('product removed', async () => {
      const result = await subject();
      expect(result.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('without variations', () => {
    beforeEach(async () => {
      product = await SlFactory.create('Product', { productId });
      productInfo = {
        price: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        medias: [
          {
            images: {
              thumb: {
                url: 'thumb_url',
              },
              original: {
                url: 'original_url',
              },
            },
          },
        ],
        variations: [],
      };
    });

    test('product attrs updated', async () => {
      const result = await subject();
      expect(result.price.cents).toEqual(100);
      expect(result.media.get('images').thumb).toEqual('thumb_url');
    });
  });

  describe('with variations && same_price === false', () => {
    beforeEach(async () => {
      const variationId = new mongoose.Types.ObjectId();
      product = await SlFactory.create('Product', { variationId, productId });
      productInfo = {
        same_price: false,
        price: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        unlimited_quantity: true,
        medias: [
          {
            images: {
              thumb: {
                url: 'thumb_url',
              },
              original: {
                url: 'original_url',
              },
            },
          },
        ],
        variations: [
          {
            id: variationId.toString(),
            price: {
              cents: 50,
              dollars: 50,
              currency_iso: 'TWD',
            },
            price_sale: {
              cents: 50,
              dollars: 50,
              currency_iso: 'TWD',
            },
            unlimited_quantity: null,
            media: {
              images: {
                thumb: {
                  url: 'var_thumb_url',
                },
                original: {
                  url: 'var_original_url',
                },
              },
            },
            fields_translations: {
              en: ['Blue', 'L'],
            },
          }
        ],
      };
    });

    test('variation attrs updated', async () => {
      const result = await subject();
      expect(result.price.cents).toEqual(50);
      expect(result.unlimitedQuantity).toEqual(true);
      expect(result.media.get('images').thumb).toEqual('var_thumb_url');
      expect(result.variationFieldsTranslations.en).toEqual(expect.arrayContaining(['Blue', 'L']));
    });
  });

  describe('with variations without price && same_price === false', () => {
    beforeEach(async () => {
      const variationId = new mongoose.Types.ObjectId();
      product = await SlFactory.create('Product', { variationId, productId });
      productInfo = {
        same_price: false,
        price: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        price_sale: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        unlimited_quantity: true,
        medias: [
          {
            images: {
              thumb: {
                url: 'thumb_url',
              },
              original: {
                url: 'original_url',
              },
            },
          },
        ],
        variations: [
          {
            id: variationId.toString(),
            unlimited_quantity: null,
            media: {
              images: {
                thumb: {
                  url: 'var_thumb_url',
                },
                original: {
                  url: 'var_original_url',
                },
              },
            },
            fields_translations: {
              en: ['Blue', 'L'],
            },
          }
        ],
      };
    });

    test('variation attrs updated', async () => {
      const result = await subject();
      expect(result.price).toEqual(null);
      expect(result.unlimitedQuantity).toEqual(true);
      expect(result.media.get('images').thumb).toEqual('var_thumb_url');
      expect(result.variationFieldsTranslations.en).toEqual(expect.arrayContaining(['Blue', 'L']));
    });
  });

  describe('with variations with price cents 0 && same_price === false', () => {
    beforeEach(async () => {
      const variationId = new mongoose.Types.ObjectId();
      product = await SlFactory.create('Product', { variationId, productId });
      productInfo = {
        same_price: false,
        price: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        price_sale: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        unlimited_quantity: true,
        medias: [
          {
            images: {
              thumb: {
                url: 'thumb_url',
              },
              original: {
                url: 'original_url',
              },
            },
          },
        ],
        variations: [
          {
            id: variationId.toString(),
            unlimited_quantity: null,
            price: {
              cents: 0,
              dollars: 0,
              currency_iso: 'TWD',
            },
            media: {
              images: {
                thumb: {
                  url: 'var_thumb_url',
                },
                original: {
                  url: 'var_original_url',
                },
              },
            },
            fields_translations: {
              en: ['Blue', 'L'],
            },
          }
        ],
      };
    });

    test('variation attrs updated', async () => {
      const result = await subject();
      expect(result.price.cents).toEqual(0);
      expect(result.unlimitedQuantity).toEqual(true);
      expect(result.media.get('images').thumb).toEqual('var_thumb_url');
      expect(result.variationFieldsTranslations.en).toEqual(expect.arrayContaining(['Blue', 'L']));
    });
  });

  describe('with variations && same_price === true', () => {
    beforeEach(async () => {
      const variationId = new mongoose.Types.ObjectId();
      product = await SlFactory.create('Product', { variationId, productId });
      productInfo = {
        same_price: true,
        price: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        price_sale: {
          cents: 100,
          dollars: 100,
          currency_iso: 'TWD',
        },
        unlimited_quantity: true,
        medias: [
          {
            images: {
              thumb: {
                url: 'thumb_url',
              },
              original: {
                url: 'original_url',
              },
            },
          },
        ],
        variations: [
          {
            id: variationId.toString(),
            price: {
              cents: 50,
              dollars: 50,
              currency_iso: 'TWD',
            },
            price_sale: {
              cents: 50,
              dollars: 50,
              currency_iso: 'TWD',
            },
            unlimited_quantity: null,
            media: {
              images: {
                thumb: {
                  url: 'var_thumb_url',
                },
                original: {
                  url: 'var_original_url',
                },
              },
            },
            fields_translations: {
              en: ['Blue', 'L'],
            },
          }
        ],
      };
    });

    test('variation attrs updated', async () => {
      const result = await subject();
      expect(result.price.cents).toEqual(100);
      expect(result.unlimitedQuantity).toEqual(true);
      expect(result.media.get('images').thumb).toEqual('var_thumb_url');
      expect(result.variationFieldsTranslations.en).toEqual(expect.arrayContaining(['Blue', 'L']));
    });
  });
});
