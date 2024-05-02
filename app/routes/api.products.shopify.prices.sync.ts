import type { ActionFunctionArgs, LoaderFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { graphqlClient } from '~/utils/shopify.server';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import fs from 'fs';
import crypto from 'crypto';

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);

	if (request.method !== 'POST') {
		return json({ message: 'Method not supported' }, 405);
	}

	// TODO: Automatically get this from bulk operations
	const shopifyProductVariants = {
		'10001': {
			id: 'gid://shopify/ProductVariant/43639687119066',
			sku: '10001',
			price: '187.35',
		},
		'10002': {
			id: 'gid://shopify/ProductVariant/43639690756314',
			sku: '10002',
			price: '187.35',
		},
		'10004': {
			id: 'gid://shopify/ProductVariant/43639840571610',
			sku: '10004',
			price: '187.35',
		},
		'10003': {
			id: 'gid://shopify/ProductVariant/43639841030362',
			sku: '10003',
			price: '187.35',
		},
		'10005': {
			id: 'gid://shopify/ProductVariant/43644295872730',
			sku: '10005',
			price: '187.35',
		},
		'10006': {
			id: 'gid://shopify/ProductVariant/43644296167642',
			sku: '10006',
			price: '187.35',
		},
		'10007': {
			id: 'gid://shopify/ProductVariant/43644296462554',
			sku: '10007',
			price: '198.17',
		},
		'10008': {
			id: 'gid://shopify/ProductVariant/43644297085146',
			sku: '10008',
			price: '198.17',
		},
		'10009': {
			id: 'gid://shopify/ProductVariant/43644297511130',
			sku: '10009',
			price: '198.17',
		},
		'10010': {
			id: 'gid://shopify/ProductVariant/43644301050074',
			sku: '10010',
			price: '198.17',
		},
		'10012': {
			id: 'gid://shopify/ProductVariant/43644301213914',
			sku: '10012',
			price: '198.17',
		},
		'10013': {
			id: 'gid://shopify/ProductVariant/43644301476058',
			sku: '10013',
			price: '48.70',
		},
		'10014': {
			id: 'gid://shopify/ProductVariant/43644786671834',
			sku: '10014',
			price: '48.70',
		},
		'10015': {
			id: 'gid://shopify/ProductVariant/43647774785754',
			sku: '10015',
			price: '48.70',
		},
		'10016': {
			id: 'gid://shopify/ProductVariant/43647776129242',
			sku: '10016',
			price: '48.70',
		},
		'10017': {
			id: 'gid://shopify/ProductVariant/43647776162010',
			sku: '10017',
			price: '48.70',
		},
		'10018': {
			id: 'gid://shopify/ProductVariant/43647776194778',
			sku: '10018',
			price: '48.70',
		},
		'10019': {
			id: 'gid://shopify/ProductVariant/43647828132058',
			sku: '10019',
			price: '63.31',
		},
		'10020': {
			id: 'gid://shopify/ProductVariant/43647828328666',
			sku: '10020',
			price: '63.31',
		},
		'10021': {
			id: 'gid://shopify/ProductVariant/43647828492506',
			sku: '10021',
			price: '63.31',
		},
		'10022': {
			id: 'gid://shopify/ProductVariant/43647828852954',
			sku: '10022',
			price: '63.31',
		},
		'10023': {
			id: 'gid://shopify/ProductVariant/43647829213402',
			sku: '10023',
			price: '63.31',
		},
		'10024': {
			id: 'gid://shopify/ProductVariant/43647829344474',
			sku: '10024',
			price: '63.31',
		},
		'10025': {
			id: 'gid://shopify/ProductVariant/43647849627866',
			sku: '10025',
			price: '114.28',
		},
		'10026': {
			id: 'gid://shopify/ProductVariant/43647850086618',
			sku: '10026',
			price: '114.28',
		},
		'10027': {
			id: 'gid://shopify/ProductVariant/43647850119386',
			sku: '10027',
			price: '114.28',
		},
		'10028': {
			id: 'gid://shopify/ProductVariant/43657289892058',
			sku: '10028',
			price: '48.70',
		},
		'10029': {
			id: 'gid://shopify/ProductVariant/43657290219738',
			sku: '10029',
			price: '48.70',
		},
		'10030': {
			id: 'gid://shopify/ProductVariant/43657297461466',
			sku: '10030',
			price: '48.70',
		},
		'10031': {
			id: 'gid://shopify/ProductVariant/43657298149594',
			sku: '10031',
			price: '48.70',
		},
		'10032': {
			id: 'gid://shopify/ProductVariant/43657298477274',
			sku: '10032',
			price: '48.70',
		},
		'10033': {
			id: 'gid://shopify/ProductVariant/43657308537050',
			sku: '10033',
			price: '48.70',
		},
		'10034': {
			id: 'gid://shopify/ProductVariant/43657309094106',
			sku: '10034',
			price: '68.18',
		},
		'10035': {
			id: 'gid://shopify/ProductVariant/43657309356250',
			sku: '10035',
			price: '68.18',
		},
		'10036': {
			id: 'gid://shopify/ProductVariant/43657309651162',
			sku: '10036',
			price: '68.18',
		},
		'10037': {
			id: 'gid://shopify/ProductVariant/43657311125722',
			sku: '10037',
			price: '68.18',
		},
		'10038': {
			id: 'gid://shopify/ProductVariant/43657311322330',
			sku: '10038',
			price: '68.18',
		},
		'10039': {
			id: 'gid://shopify/ProductVariant/43657311486170',
			sku: '10039',
			price: '68.18',
		},
		'10040': {
			id: 'gid://shopify/ProductVariant/43657311846618',
			sku: '10040',
			price: '54.11',
		},
		'10041': {
			id: 'gid://shopify/ProductVariant/43657312338138',
			sku: '10041',
			price: '54.11',
		},
		'10042': {
			id: 'gid://shopify/ProductVariant/43657312731354',
			sku: '10042',
			price: '54.11',
		},
		'10011': {
			id: 'gid://shopify/ProductVariant/43677870194906',
			sku: '10011',
			price: '198.17',
		},
		'10043': {
			id: 'gid://shopify/ProductVariant/43677870293210',
			sku: '10043',
			price: '81.16',
		},
		'10044': {
			id: 'gid://shopify/ProductVariant/43677870358746',
			sku: '10044',
			price: '81.16',
		},
		'10045': {
			id: 'gid://shopify/ProductVariant/43677870391514',
			sku: '10045',
			price: '81.16',
		},
		'10046': {
			id: 'gid://shopify/ProductVariant/43677870457050',
			sku: '10046',
			price: '81.16',
		},
		'10047': {
			id: 'gid://shopify/ProductVariant/43677870489818',
			sku: '10047',
			price: '81.16',
		},
		'10048': {
			id: 'gid://shopify/ProductVariant/43677870555354',
			sku: '10048',
			price: '81.16',
		},
		'10049': {
			id: 'gid://shopify/ProductVariant/43677870588122',
			sku: '10049',
			price: '107.13',
		},
		'10050': {
			id: 'gid://shopify/ProductVariant/43677870653658',
			sku: '10050',
			price: '107.13',
		},
		'10051': {
			id: 'gid://shopify/ProductVariant/43677870686426',
			sku: '10051',
			price: '107.13',
		},
		'10052': {
			id: 'gid://shopify/ProductVariant/43677870719194',
			sku: '10052',
			price: '107.13',
		},
		'10053': {
			id: 'gid://shopify/ProductVariant/43677870784730',
			sku: '10053',
			price: '107.13',
		},
		'10054': {
			id: 'gid://shopify/ProductVariant/43677870850266',
			sku: '10054',
			price: '107.13',
		},
		'10055': {
			id: 'gid://shopify/ProductVariant/43677870915802',
			sku: '10055',
			price: '114.28',
		},
		'10056': {
			id: 'gid://shopify/ProductVariant/43677870948570',
			sku: '10056',
			price: '114.28',
		},
		'10057': {
			id: 'gid://shopify/ProductVariant/43677871014106',
			sku: '10057',
			price: '114.28',
		},
		'10058': {
			id: 'gid://shopify/ProductVariant/43677871046874',
			sku: '10058',
			price: '130.83',
		},
		'10059': {
			id: 'gid://shopify/ProductVariant/43677871112410',
			sku: '10059',
			price: '130.83',
		},
		'10060': {
			id: 'gid://shopify/ProductVariant/43677871145178',
			sku: '10060',
			price: '130.83',
		},
		'10061': {
			id: 'gid://shopify/ProductVariant/43677871177946',
			sku: '10061',
			price: '130.83',
		},
		'10062': {
			id: 'gid://shopify/ProductVariant/43677871243482',
			sku: '10062',
			price: '130.83',
		},
		'10063': {
			id: 'gid://shopify/ProductVariant/43677871309018',
			sku: '10063',
			price: '130.83',
		},
		'10064': {
			id: 'gid://shopify/ProductVariant/43677871374554',
			sku: '10064',
			price: '178.56',
		},
		'10065': {
			id: 'gid://shopify/ProductVariant/43677871440090',
			sku: '10065',
			price: '178.56',
		},
		'10066': {
			id: 'gid://shopify/ProductVariant/43677871505626',
			sku: '10066',
			price: '178.56',
		},
		'10067': {
			id: 'gid://shopify/ProductVariant/43677871538394',
			sku: '10067',
			price: '178.56',
		},
		'10068': {
			id: 'gid://shopify/ProductVariant/43677871603930',
			sku: '10068',
			price: '178.56',
		},
		'10069': {
			id: 'gid://shopify/ProductVariant/43677871636698',
			sku: '10069',
			price: '178.56',
		},
		'10070': {
			id: 'gid://shopify/ProductVariant/43677871767770',
			sku: '10070',
			price: '9958.40',
		},
		'10071': {
			id: 'gid://shopify/ProductVariant/43677871866074',
			sku: '10071',
			price: '9958.40',
		},
		'10072': {
			id: 'gid://shopify/ProductVariant/43677872062682',
			sku: '10072',
			price: '9958.40',
		},
		'10073': {
			id: 'gid://shopify/ProductVariant/43677872193754',
			sku: '10073',
			price: '9958.40',
		},
		'10074': {
			id: 'gid://shopify/ProductVariant/43677872357594',
			sku: '10074',
			price: '135.27',
		},
		'10075': {
			id: 'gid://shopify/ProductVariant/43677872488666',
			sku: '10075',
			price: '135.27',
		},
		'10076': {
			id: 'gid://shopify/ProductVariant/43677872685274',
			sku: '10076',
			price: '135.27',
		},
		'10077': {
			id: 'gid://shopify/ProductVariant/43677872750810',
			sku: '10077',
			price: '135.27',
		},
		'10078': {
			id: 'gid://shopify/ProductVariant/43677872816346',
			sku: '10078',
			price: '135.27',
		},
		'10079': {
			id: 'gid://shopify/ProductVariant/43677872849114',
			sku: '10079',
			price: '135.27',
		},
		'10080': {
			id: 'gid://shopify/ProductVariant/43677872914650',
			sku: '10080',
			price: '48.70',
		},
		'10081': {
			id: 'gid://shopify/ProductVariant/43677872947418',
			sku: '10081',
			price: '48.70',
		},
		'10082': {
			id: 'gid://shopify/ProductVariant/43677873012954',
			sku: '10082',
			price: '63.31',
		},
		'10083': {
			id: 'gid://shopify/ProductVariant/43677873045722',
			sku: '10083',
			price: '63.31',
		},
		'10084': {
			id: 'gid://shopify/ProductVariant/43677873078490',
			sku: '10084',
			price: '147.57',
		},
		'10085': {
			id: 'gid://shopify/ProductVariant/43677873176794',
			sku: '10085',
			price: '147.57',
		},
		'10086': {
			id: 'gid://shopify/ProductVariant/43677873242330',
			sku: '10086',
			price: '147.57',
		},
		'10087': {
			id: 'gid://shopify/ProductVariant/43677873275098',
			sku: '10087',
			price: '147.57',
		},
		'10088': {
			id: 'gid://shopify/ProductVariant/43677873340634',
			sku: '10088',
			price: '147.57',
		},
		'10089': {
			id: 'gid://shopify/ProductVariant/43677873373402',
			sku: '10089',
			price: '41.23',
		},
		'10090': {
			id: 'gid://shopify/ProductVariant/43677873438938',
			sku: '10090',
			price: '41.23',
		},
		'10091': {
			id: 'gid://shopify/ProductVariant/43677873471706',
			sku: '10091',
			price: '41.23',
		},
		'10092': {
			id: 'gid://shopify/ProductVariant/43677873537242',
			sku: '10092',
			price: '41.23',
		},
		'10093': {
			id: 'gid://shopify/ProductVariant/43677873570010',
			sku: '10093',
			price: '41.23',
		},
		'10094': {
			id: 'gid://shopify/ProductVariant/43677873635546',
			sku: '10094',
			price: '148.62',
		},
		'10095': {
			id: 'gid://shopify/ProductVariant/43677873668314',
			sku: '10095',
			price: '148.62',
		},
		'10096': {
			id: 'gid://shopify/ProductVariant/43677873733850',
			sku: '10096',
			price: '148.62',
		},
		'10097': {
			id: 'gid://shopify/ProductVariant/43677875110106',
			sku: '10097',
			price: '148.62',
		},
		'10098': {
			id: 'gid://shopify/ProductVariant/43677876584666',
			sku: '10098',
			price: '148.62',
		},
		'10099': {
			id: 'gid://shopify/ProductVariant/43677876617434',
			sku: '10099',
			price: '265.62',
		},
		'10100': {
			id: 'gid://shopify/ProductVariant/43677876682970',
			sku: '10100',
			price: '265.62',
		},
		'10101': {
			id: 'gid://shopify/ProductVariant/43677876715738',
			sku: '10101',
			price: '265.62',
		},
		'10102': {
			id: 'gid://shopify/ProductVariant/43677876781274',
			sku: '10102',
			price: '265.62',
		},
		'10103': {
			id: 'gid://shopify/ProductVariant/43677876846810',
			sku: '10103',
			price: '265.62',
		},
		'10104': {
			id: 'gid://shopify/ProductVariant/43677876912346',
			sku: '10104',
			price: '52.76',
		},
		'10105': {
			id: 'gid://shopify/ProductVariant/43677876945114',
			sku: '10105',
			price: '52.76',
		},
		'10106': {
			id: 'gid://shopify/ProductVariant/43677877010650',
			sku: '10106',
			price: '52.76',
		},
		'10107': {
			id: 'gid://shopify/ProductVariant/43677877043418',
			sku: '10107',
			price: '52.76',
		},
		'10108': {
			id: 'gid://shopify/ProductVariant/43677877108954',
			sku: '10108',
			price: '52.76',
		},
		'10109': {
			id: 'gid://shopify/ProductVariant/43677877207258',
			sku: '10109',
			price: '51.88',
		},
		'10110': {
			id: 'gid://shopify/ProductVariant/43677877272794',
			sku: '10110',
			price: '51.88',
		},
		'10111': {
			id: 'gid://shopify/ProductVariant/43677877338330',
			sku: '10111',
			price: '51.88',
		},
		'10112': {
			id: 'gid://shopify/ProductVariant/43677877371098',
			sku: '10112',
			price: '51.88',
		},
		'10113': {
			id: 'gid://shopify/ProductVariant/43677877436634',
			sku: '10113',
			price: '51.88',
		},
		'10114': {
			id: 'gid://shopify/ProductVariant/43677877469402',
			sku: '10114',
			price: '187.35',
		},
		'10115': {
			id: 'gid://shopify/ProductVariant/43677877534938',
			sku: '10115',
			price: '187.35',
		},
		'10116': {
			id: 'gid://shopify/ProductVariant/43677877600474',
			sku: '10116',
			price: '187.35',
		},
		'10117': {
			id: 'gid://shopify/ProductVariant/43677877666010',
			sku: '10117',
			price: '187.35',
		},
		'10118': {
			id: 'gid://shopify/ProductVariant/43677877698778',
			sku: '10118',
			price: '187.35',
		},
		'10119': {
			id: 'gid://shopify/ProductVariant/43677877797082',
			sku: '10119',
			price: '48.70',
		},
		'10120': {
			id: 'gid://shopify/ProductVariant/43677877829850',
			sku: '10120',
			price: '48.70',
		},
		'10121': {
			id: 'gid://shopify/ProductVariant/43677877895386',
			sku: '10121',
			price: '48.70',
		},
		'10122': {
			id: 'gid://shopify/ProductVariant/43677877960922',
			sku: '10122',
			price: '48.70',
		},
		'10123': {
			id: 'gid://shopify/ProductVariant/43677877993690',
			sku: '10123',
			price: '48.70',
		},
		'10124': {
			id: 'gid://shopify/ProductVariant/43677878059226',
			sku: '10124',
			price: '48.70',
		},
		'10125': {
			id: 'gid://shopify/ProductVariant/43677878091994',
			sku: '10125',
			price: '48.70',
		},
		'10126': {
			id: 'gid://shopify/ProductVariant/43677878190298',
			sku: '10126',
			price: '48.70',
		},
		'10127': {
			id: 'gid://shopify/ProductVariant/43677878255834',
			sku: '10127',
			price: '48.70',
		},
		'10128': {
			id: 'gid://shopify/ProductVariant/43677878288602',
			sku: '10128',
			price: '48.70',
		},
		'10129': {
			id: 'gid://shopify/ProductVariant/43677878354138',
			sku: '10129',
			price: '81.16',
		},
		'10130': {
			id: 'gid://shopify/ProductVariant/43677878419674',
			sku: '10130',
			price: '81.16',
		},
		'10131': {
			id: 'gid://shopify/ProductVariant/43677878517978',
			sku: '10131',
			price: '81.16',
		},
		'10132': {
			id: 'gid://shopify/ProductVariant/43677878550746',
			sku: '10132',
			price: '81.16',
		},
		'10133': {
			id: 'gid://shopify/ProductVariant/43677878583514',
			sku: '10133',
			price: '81.16',
		},
		'10134': {
			id: 'gid://shopify/ProductVariant/43677878681818',
			sku: '10134',
			price: '14.61',
		},
		'10135': {
			id: 'gid://shopify/ProductVariant/43677878714586',
			sku: '10135',
			price: '14.61',
		},
		'10136': {
			id: 'gid://shopify/ProductVariant/43677878780122',
			sku: '10136',
			price: '14.61',
		},
		'10137': {
			id: 'gid://shopify/ProductVariant/43677878812890',
			sku: '10137',
			price: '14.61',
		},
		'10138': {
			id: 'gid://shopify/ProductVariant/43677878878426',
			sku: '10138',
			price: '14.61',
		},
		'10139': {
			id: 'gid://shopify/ProductVariant/43677878911194',
			sku: '10139',
			price: '67.64',
		},
		'10140': {
			id: 'gid://shopify/ProductVariant/43677878976730',
			sku: '10140',
			price: '67.64',
		},
		'10141': {
			id: 'gid://shopify/ProductVariant/43677879009498',
			sku: '10141',
			price: '67.64',
		},
		'10142': {
			id: 'gid://shopify/ProductVariant/43677879075034',
			sku: '10142',
			price: '67.64',
		},
		'10143': {
			id: 'gid://shopify/ProductVariant/43677879173338',
			sku: '10143',
			price: '135.27',
		},
		'10144': {
			id: 'gid://shopify/ProductVariant/43677879206106',
			sku: '10144',
			price: '60.06',
		},
		'10145': {
			id: 'gid://shopify/ProductVariant/43677879238874',
			sku: '10145',
			price: '60.06',
		},
		'10146': {
			id: 'gid://shopify/ProductVariant/43677879271642',
			sku: '10146',
			price: '60.06',
		},
		'10147': {
			id: 'gid://shopify/ProductVariant/43677879337178',
			sku: '10147',
			price: '60.06',
		},
		'10148': {
			id: 'gid://shopify/ProductVariant/43677879402714',
			sku: '10148',
			price: '60.06',
		},
		'10149': {
			id: 'gid://shopify/ProductVariant/43677879435482',
			sku: '10149',
			price: '52.76',
		},
		'10150': {
			id: 'gid://shopify/ProductVariant/43677879566554',
			sku: '10150',
			price: '52.76',
		},
		'10151': {
			id: 'gid://shopify/ProductVariant/43677879599322',
			sku: '10151',
			price: '52.76',
		},
		'10152': {
			id: 'gid://shopify/ProductVariant/43677879697626',
			sku: '10152',
			price: '68.58',
		},
		'10153': {
			id: 'gid://shopify/ProductVariant/43677879730394',
			sku: '10153',
			price: '68.58',
		},
		'10154': {
			id: 'gid://shopify/ProductVariant/43677879795930',
			sku: '10154',
			price: '68.58',
		},
		'10155': {
			id: 'gid://shopify/ProductVariant/43677879861466',
			sku: '10155',
			price: '187.35',
		},
		'10156': {
			id: 'gid://shopify/ProductVariant/43677879959770',
			sku: '10156',
			price: '187.35',
		},
		'10157': {
			id: 'gid://shopify/ProductVariant/43677880025306',
			sku: '10157',
			price: '187.35',
		},
		'10158': {
			id: 'gid://shopify/ProductVariant/43677880090842',
			sku: '10158',
			price: '198.17',
		},
		'10159': {
			id: 'gid://shopify/ProductVariant/43677880156378',
			sku: '10159',
			price: '198.17',
		},
		'10160': {
			id: 'gid://shopify/ProductVariant/43677880221914',
			sku: '10160',
			price: '198.17',
		},
		'10161': {
			id: 'gid://shopify/ProductVariant/43677880254682',
			sku: '10161',
			price: '48.70',
		},
		'10162': {
			id: 'gid://shopify/ProductVariant/43677880352986',
			sku: '10162',
			price: '48.70',
		},
		'10163': {
			id: 'gid://shopify/ProductVariant/43677880385754',
			sku: '10163',
			price: '48.70',
		},
		'10164': {
			id: 'gid://shopify/ProductVariant/43677880451290',
			sku: '10164',
			price: '63.31',
		},
		'10165': {
			id: 'gid://shopify/ProductVariant/43677880484058',
			sku: '10165',
			price: '63.31',
		},
		'10166': {
			id: 'gid://shopify/ProductVariant/43677880582362',
			sku: '10166',
			price: '63.31',
		},
		'10167': {
			id: 'gid://shopify/ProductVariant/43677880615130',
			sku: '10167',
			price: '31.05',
		},
		'10168': {
			id: 'gid://shopify/ProductVariant/43677880680666',
			sku: '10168',
			price: '31.05',
		},
		'10169': {
			id: 'gid://shopify/ProductVariant/43677880778970',
			sku: '10169',
			price: '31.05',
		},
		'10170': {
			id: 'gid://shopify/ProductVariant/43677880877274',
			sku: '10170',
			price: '90.90',
		},
		'10171': {
			id: 'gid://shopify/ProductVariant/43677880910042',
			sku: '10171',
			price: '90.90',
		},
		'10172': {
			id: 'gid://shopify/ProductVariant/43677880942810',
			sku: '10172',
			price: '90.90',
		},
		'10173': {
			id: 'gid://shopify/ProductVariant/43677881008346',
			sku: '10173',
			price: '58.44',
		},
		'10174': {
			id: 'gid://shopify/ProductVariant/43677881041114',
			sku: '10174',
			price: '58.44',
		},
		'10175': {
			id: 'gid://shopify/ProductVariant/43677881106650',
			sku: '10175',
			price: '58.44',
		},
		'10176': {
			id: 'gid://shopify/ProductVariant/43677881139418',
			sku: '10176',
			price: '135.27',
		},
		'10177': {
			id: 'gid://shopify/ProductVariant/43677881204954',
			sku: '10177',
			price: '135.27',
		},
		'10178': {
			id: 'gid://shopify/ProductVariant/43677881237722',
			sku: '10178',
			price: '135.27',
		},
		'10200': {
			id: 'gid://shopify/ProductVariant/43677882351834',
			sku: '10200',
			price: '0.00',
		},
		'10201': {
			id: 'gid://shopify/ProductVariant/43677882384602',
			sku: '10201',
			price: '0.00',
		},
		'10202': {
			id: 'gid://shopify/ProductVariant/43677882450138',
			sku: '10202',
			price: '0.00',
		},
		'10203': {
			id: 'gid://shopify/ProductVariant/43677882515674',
			sku: '10203',
			price: '0.00',
		},
		'10204': {
			id: 'gid://shopify/ProductVariant/43677882581210',
			sku: '10204',
			price: '0.00',
		},
		'10205': {
			id: 'gid://shopify/ProductVariant/43677882613978',
			sku: '10205',
			price: '0.00',
		},
		'10206': {
			id: 'gid://shopify/ProductVariant/43677882646746',
			sku: '10206',
			price: '0.00',
		},
		'10207': {
			id: 'gid://shopify/ProductVariant/43677882712282',
			sku: '10207',
			price: '0.00',
		},
		'10208': {
			id: 'gid://shopify/ProductVariant/43677882745050',
			sku: '10208',
			price: '0.00',
		},
		'10209': {
			id: 'gid://shopify/ProductVariant/43677882810586',
			sku: '10209',
			price: '0.00',
		},
		'10210': {
			id: 'gid://shopify/ProductVariant/43677882843354',
			sku: '10210',
			price: '0.00',
		},
		'10211': {
			id: 'gid://shopify/ProductVariant/43677882876122',
			sku: '10211',
			price: '0.00',
		},
		'10212': {
			id: 'gid://shopify/ProductVariant/43677882974426',
			sku: '10212',
			price: '0.00',
		},
		'10213': {
			id: 'gid://shopify/ProductVariant/43677883007194',
			sku: '10213',
			price: '0.00',
		},
		'10214': {
			id: 'gid://shopify/ProductVariant/43677883072730',
			sku: '10214',
			price: '0.00',
		},
		'10215': {
			id: 'gid://shopify/ProductVariant/43677883105498',
			sku: '10215',
			price: '0.00',
		},
		'10216': {
			id: 'gid://shopify/ProductVariant/43677883171034',
			sku: '10216',
			price: '0.00',
		},
		'10217': {
			id: 'gid://shopify/ProductVariant/43677883203802',
			sku: '10217',
			price: '0.00',
		},
		'10218': {
			id: 'gid://shopify/ProductVariant/43677883269338',
			sku: '10218',
			price: '0.00',
		},
		'10219': {
			id: 'gid://shopify/ProductVariant/43677883302106',
			sku: '10219',
			price: '0.00',
		},
		'10220': {
			id: 'gid://shopify/ProductVariant/43677883334874',
			sku: '10220',
			price: '0.00',
		},
		'10221': {
			id: 'gid://shopify/ProductVariant/43677883433178',
			sku: '10221',
			price: '0.00',
		},
		'10222': {
			id: 'gid://shopify/ProductVariant/43677883465946',
			sku: '10222',
			price: '0.00',
		},
		'10223': {
			id: 'gid://shopify/ProductVariant/43677883531482',
			sku: '10223',
			price: '0.00',
		},
		'10224': {
			id: 'gid://shopify/ProductVariant/43677883564250',
			sku: '10224',
			price: '54.11',
		},
		'10225': {
			id: 'gid://shopify/ProductVariant/43677883629786',
			sku: '10225',
			price: '54.11',
		},
		'10226': {
			id: 'gid://shopify/ProductVariant/43677883662554',
			sku: '10226',
			price: '54.11',
		},
		'10227': {
			id: 'gid://shopify/ProductVariant/43677883760858',
			sku: '10227',
			price: '54.11',
		},
		'10228': {
			id: 'gid://shopify/ProductVariant/43677883793626',
			sku: '10228',
			price: '54.11',
		},
		'10229': {
			id: 'gid://shopify/ProductVariant/43677883859162',
			sku: '10229',
			price: '54.11',
		},
		'10235': {
			id: 'gid://shopify/ProductVariant/43677883990234',
			sku: '10235',
			price: '495.99',
		},
		'10236': {
			id: 'gid://shopify/ProductVariant/43677884023002',
			sku: '10236',
			price: '471.19',
		},
		'10237': {
			id: 'gid://shopify/ProductVariant/43677884088538',
			sku: '10237',
			price: '471.19',
		},
		'10238': {
			id: 'gid://shopify/ProductVariant/43677884154074',
			sku: '10238',
			price: '471.19',
		},
		'10239': {
			id: 'gid://shopify/ProductVariant/43677884219610',
			sku: '10239',
			price: '471.19',
		},
		'10240': {
			id: 'gid://shopify/ProductVariant/43677884252378',
			sku: '10240',
			price: '495.99',
		},
		'10241': {
			id: 'gid://shopify/ProductVariant/43677884317914',
			sku: '10241',
			price: '495.99',
		},
		'10242': {
			id: 'gid://shopify/ProductVariant/43677884350682',
			sku: '10242',
			price: '495.99',
		},
		'10243': {
			id: 'gid://shopify/ProductVariant/43677884416218',
			sku: '10243',
			price: '223.20',
		},
		'10244': {
			id: 'gid://shopify/ProductVariant/43677884514522',
			sku: '10244',
			price: '208.32',
		},
		'10245': {
			id: 'gid://shopify/ProductVariant/43677884547290',
			sku: '10245',
			price: '208.32',
		},
		'10246': {
			id: 'gid://shopify/ProductVariant/43677884645594',
			sku: '10246',
			price: '208.32',
		},
		'10247': {
			id: 'gid://shopify/ProductVariant/43677884678362',
			sku: '10247',
			price: '208.32',
		},
		'10248': {
			id: 'gid://shopify/ProductVariant/43677884743898',
			sku: '10248',
			price: '223.20',
		},
		'10249': {
			id: 'gid://shopify/ProductVariant/43677884776666',
			sku: '10249',
			price: '223.20',
		},
		'10250': {
			id: 'gid://shopify/ProductVariant/43677884842202',
			sku: '10250',
			price: '223.20',
		},
		'10251': {
			id: 'gid://shopify/ProductVariant/43677884874970',
			sku: '10251',
			price: '63.31',
		},
		'10252': {
			id: 'gid://shopify/ProductVariant/43677884940506',
			sku: '10252',
			price: '48.70',
		},
		'10253': {
			id: 'gid://shopify/ProductVariant/43677884973274',
			sku: '10253',
			price: '48.70',
		},
		'10254': {
			id: 'gid://shopify/ProductVariant/43677885038810',
			sku: '10254',
			price: '48.70',
		},
		'10255': {
			id: 'gid://shopify/ProductVariant/43677885071578',
			sku: '10255',
			price: '48.70',
		},
		'10256': {
			id: 'gid://shopify/ProductVariant/43677885202650',
			sku: '10256',
			price: '63.31',
		},
		'10257': {
			id: 'gid://shopify/ProductVariant/43677885235418',
			sku: '10257',
			price: '63.31',
		},
		'10258': {
			id: 'gid://shopify/ProductVariant/43677885268186',
			sku: '10258',
			price: '63.31',
		},
		'10259': {
			id: 'gid://shopify/ProductVariant/43677885333722',
			sku: '10259',
			price: '48.70',
		},
		'10260': {
			id: 'gid://shopify/ProductVariant/43677885366490',
			sku: '10260',
			price: '48.70',
		},
		'10261': {
			id: 'gid://shopify/ProductVariant/43677885432026',
			sku: '10261',
			price: '48.70',
		},
		'10262': {
			id: 'gid://shopify/ProductVariant/43677885464794',
			sku: '10262',
			price: '48.70',
		},
		'10263': {
			id: 'gid://shopify/ProductVariant/43677885530330',
			sku: '10263',
			price: '68.18',
		},
		'10264': {
			id: 'gid://shopify/ProductVariant/43677885595866',
			sku: '10264',
			price: '68.18',
		},
		'10265': {
			id: 'gid://shopify/ProductVariant/43677885628634',
			sku: '10265',
			price: '68.18',
		},
		'10266': {
			id: 'gid://shopify/ProductVariant/43677885694170',
			sku: '10266',
			price: '68.18',
		},
		'10267': {
			id: 'gid://shopify/ProductVariant/43677885792474',
			sku: '10267',
			price: '81.16',
		},
		'10268': {
			id: 'gid://shopify/ProductVariant/43677885890778',
			sku: '10268',
			price: '81.16',
		},
		'10269': {
			id: 'gid://shopify/ProductVariant/43677885923546',
			sku: '10269',
			price: '81.16',
		},
		'10270': {
			id: 'gid://shopify/ProductVariant/43677885956314',
			sku: '10270',
			price: '81.16',
		},
		'10271': {
			id: 'gid://shopify/ProductVariant/43677886021850',
			sku: '10271',
			price: '107.13',
		},
		'10272': {
			id: 'gid://shopify/ProductVariant/43677886054618',
			sku: '10272',
			price: '107.13',
		},
		'10273': {
			id: 'gid://shopify/ProductVariant/43677886152922',
			sku: '10273',
			price: '107.13',
		},
		'10274': {
			id: 'gid://shopify/ProductVariant/43677886185690',
			sku: '10274',
			price: '107.13',
		},
		'10275': {
			id: 'gid://shopify/ProductVariant/43677886251226',
			sku: '10275',
			price: '21.83',
		},
		'10276': {
			id: 'gid://shopify/ProductVariant/43677886283994',
			sku: '10276',
			price: '21.83',
		},
		'10277': {
			id: 'gid://shopify/ProductVariant/43677886349530',
			sku: '10277',
			price: '21.83',
		},
		'10278': {
			id: 'gid://shopify/ProductVariant/43677886382298',
			sku: '10278',
			price: '21.83',
		},
		'10279': {
			id: 'gid://shopify/ProductVariant/43677886447834',
			sku: '10279',
			price: '31.05',
		},
		'10280': {
			id: 'gid://shopify/ProductVariant/43677886480602',
			sku: '10280',
			price: '31.05',
		},
		'10281': {
			id: 'gid://shopify/ProductVariant/43677886546138',
			sku: '10281',
			price: '31.05',
		},
		'10282': {
			id: 'gid://shopify/ProductVariant/43677886578906',
			sku: '10282',
			price: '31.05',
		},
		'10283': {
			id: 'gid://shopify/ProductVariant/43677886611674',
			sku: '10283',
			price: '89.28',
		},
		'10284': {
			id: 'gid://shopify/ProductVariant/43677886677210',
			sku: '10284',
			price: '65.42',
		},
		'10285': {
			id: 'gid://shopify/ProductVariant/43677886709978',
			sku: '10285',
			price: '65.42',
		},
		'10286': {
			id: 'gid://shopify/ProductVariant/43677886775514',
			sku: '10286',
			price: '65.42',
		},
		'10287': {
			id: 'gid://shopify/ProductVariant/43677886808282',
			sku: '10287',
			price: '65.42',
		},
		'10288': {
			id: 'gid://shopify/ProductVariant/43677886841050',
			sku: '10288',
			price: '89.28',
		},
		'10289': {
			id: 'gid://shopify/ProductVariant/43677886906586',
			sku: '10289',
			price: '89.28',
		},
		'10290': {
			id: 'gid://shopify/ProductVariant/43677887004890',
			sku: '10290',
			price: '89.28',
		},
		'10291': {
			id: 'gid://shopify/ProductVariant/43677887037658',
			sku: '10291',
			price: '67.64',
		},
		'10292': {
			id: 'gid://shopify/ProductVariant/43677887103194',
			sku: '10292',
			price: '67.64',
		},
		'10293': {
			id: 'gid://shopify/ProductVariant/43677887168730',
			sku: '10293',
			price: '67.64',
		},
		'10294': {
			id: 'gid://shopify/ProductVariant/43677887201498',
			sku: '10294',
			price: '67.64',
		},
		'10317': {
			id: 'gid://shopify/ProductVariant/43677888250074',
			sku: '10317',
			price: '189.38',
		},
		'10318': {
			id: 'gid://shopify/ProductVariant/43677888315610',
			sku: '10318',
			price: '189.38',
		},
		'10319': {
			id: 'gid://shopify/ProductVariant/43677888348378',
			sku: '10319',
			price: '189.38',
		},
		'10320': {
			id: 'gid://shopify/ProductVariant/43677888446682',
			sku: '10320',
			price: '189.38',
		},
		'10321': {
			id: 'gid://shopify/ProductVariant/43677888479450',
			sku: '10321',
			price: '46.59',
		},
		'10322': {
			id: 'gid://shopify/ProductVariant/43677888544986',
			sku: '10322',
			price: '46.59',
		},
		'10323': {
			id: 'gid://shopify/ProductVariant/43677888577754',
			sku: '10323',
			price: '46.59',
		},
		'10324': {
			id: 'gid://shopify/ProductVariant/43677888643290',
			sku: '10324',
			price: '46.59',
		},
		'10325': {
			id: 'gid://shopify/ProductVariant/43677888676058',
			sku: '10325',
			price: '107.31',
		},
		'10326': {
			id: 'gid://shopify/ProductVariant/43677888708826',
			sku: '10326',
			price: '107.31',
		},
		'10327': {
			id: 'gid://shopify/ProductVariant/43677888774362',
			sku: '10327',
			price: '107.31',
		},
		'10328': {
			id: 'gid://shopify/ProductVariant/43677888807130',
			sku: '10328',
			price: '107.31',
		},
		'10333': {
			id: 'gid://shopify/ProductVariant/43677889102042',
			sku: '10333',
			price: '53.12',
		},
		'10334': {
			id: 'gid://shopify/ProductVariant/43677889134810',
			sku: '10334',
			price: '53.12',
		},
		'10335': {
			id: 'gid://shopify/ProductVariant/43677889167578',
			sku: '10335',
			price: '53.12',
		},
		'10336': {
			id: 'gid://shopify/ProductVariant/43677889233114',
			sku: '10336',
			price: '53.12',
		},
		'10337': {
			id: 'gid://shopify/ProductVariant/43677889298650',
			sku: '10337',
			price: '53.12',
		},
		'10338': {
			id: 'gid://shopify/ProductVariant/43677889364186',
			sku: '10338',
			price: '53.12',
		},
		'10339': {
			id: 'gid://shopify/ProductVariant/43677889429722',
			sku: '10339',
			price: '74.56',
		},
		'10340': {
			id: 'gid://shopify/ProductVariant/43677889495258',
			sku: '10340',
			price: '74.56',
		},
		'10341': {
			id: 'gid://shopify/ProductVariant/43677889560794',
			sku: '10341',
			price: '74.56',
		},
		'10342': {
			id: 'gid://shopify/ProductVariant/43677889626330',
			sku: '10342',
			price: '74.56',
		},
		'10343': {
			id: 'gid://shopify/ProductVariant/43677889724634',
			sku: '10343',
			price: '74.56',
		},
		'10344': {
			id: 'gid://shopify/ProductVariant/43677889757402',
			sku: '10344',
			price: '74.56',
		},
		'10345': {
			id: 'gid://shopify/ProductVariant/43677889855706',
			sku: '10345',
			price: '81.33',
		},
		'10346': {
			id: 'gid://shopify/ProductVariant/43677889888474',
			sku: '10346',
			price: '81.33',
		},
		'10347': {
			id: 'gid://shopify/ProductVariant/43677889986778',
			sku: '10347',
			price: '81.33',
		},
		'10348': {
			id: 'gid://shopify/ProductVariant/43677890019546',
			sku: '10348',
			price: '81.33',
		},
		'10349': {
			id: 'gid://shopify/ProductVariant/43677890085082',
			sku: '10349',
			price: '81.33',
		},
		'10350': {
			id: 'gid://shopify/ProductVariant/43677890150618',
			sku: '10350',
			price: '81.33',
		},
		'10351': {
			id: 'gid://shopify/ProductVariant/43677890216154',
			sku: '10351',
			price: '106.81',
		},
		'10352': {
			id: 'gid://shopify/ProductVariant/43677890314458',
			sku: '10352',
			price: '106.81',
		},
		'10353': {
			id: 'gid://shopify/ProductVariant/43677890347226',
			sku: '10353',
			price: '106.81',
		},
		'10354': {
			id: 'gid://shopify/ProductVariant/43677890445530',
			sku: '10354',
			price: '106.81',
		},
		'10355': {
			id: 'gid://shopify/ProductVariant/43677890511066',
			sku: '10355',
			price: '106.81',
		},
		'10356': {
			id: 'gid://shopify/ProductVariant/43677890576602',
			sku: '10356',
			price: '106.81',
		},
		'10357': {
			id: 'gid://shopify/ProductVariant/43677890642138',
			sku: '10357',
			price: '31.05',
		},
		'10358': {
			id: 'gid://shopify/ProductVariant/43677890674906',
			sku: '10358',
			price: '31.05',
		},
		'10359': {
			id: 'gid://shopify/ProductVariant/43677890773210',
			sku: '10359',
			price: '31.05',
		},
		'10360': {
			id: 'gid://shopify/ProductVariant/43677890838746',
			sku: '10360',
			price: '31.05',
		},
		'10361': {
			id: 'gid://shopify/ProductVariant/43677890904282',
			sku: '10361',
			price: '31.05',
		},
		'10362': {
			id: 'gid://shopify/ProductVariant/43677890969818',
			sku: '10362',
			price: '31.05',
		},
		'10363': {
			id: 'gid://shopify/ProductVariant/43677891035354',
			sku: '10363',
			price: '9919.82',
		},
		'10364': {
			id: 'gid://shopify/ProductVariant/43677891100890',
			sku: '10364',
			price: '9919.82',
		},
		'10365': {
			id: 'gid://shopify/ProductVariant/43677891166426',
			sku: '10365',
			price: '9919.82',
		},
		'10366': {
			id: 'gid://shopify/ProductVariant/43677891231962',
			sku: '10366',
			price: '9919.82',
		},
		'10367': {
			id: 'gid://shopify/ProductVariant/43677891297498',
			sku: '10367',
			price: '9919.82',
		},
		'10368': {
			id: 'gid://shopify/ProductVariant/43677891330266',
			sku: '10368',
			price: '9919.82',
		},
		'10369': {
			id: 'gid://shopify/ProductVariant/43677891395802',
			sku: '10369',
			price: '11903.78',
		},
		'10370': {
			id: 'gid://shopify/ProductVariant/43677891428570',
			sku: '10370',
			price: '11903.78',
		},
		'10371': {
			id: 'gid://shopify/ProductVariant/43677891526874',
			sku: '10371',
			price: '11903.78',
		},
		'10372': {
			id: 'gid://shopify/ProductVariant/43677891592410',
			sku: '10372',
			price: '11903.78',
		},
		'10373': {
			id: 'gid://shopify/ProductVariant/43677891625178',
			sku: '10373',
			price: '11903.78',
		},
		'10374': {
			id: 'gid://shopify/ProductVariant/43677891690714',
			sku: '10374',
			price: '11903.78',
		},
		'10375': {
			id: 'gid://shopify/ProductVariant/43677891723482',
			sku: '10375',
			price: '14879.73',
		},
		'10376': {
			id: 'gid://shopify/ProductVariant/43677891756250',
			sku: '10376',
			price: '14879.73',
		},
		'10377': {
			id: 'gid://shopify/ProductVariant/43677891821786',
			sku: '10377',
			price: '14879.73',
		},
		'10378': {
			id: 'gid://shopify/ProductVariant/43677891854554',
			sku: '10378',
			price: '14879.73',
		},
		'10379': {
			id: 'gid://shopify/ProductVariant/43677891920090',
			sku: '10379',
			price: '14879.73',
		},
		'10380': {
			id: 'gid://shopify/ProductVariant/43677891985626',
			sku: '10380',
			price: '14879.73',
		},
		'10381': {
			id: 'gid://shopify/ProductVariant/43677892051162',
			sku: '10381',
			price: '14879.73',
		},
		'10382': {
			id: 'gid://shopify/ProductVariant/43677892116698',
			sku: '10382',
			price: '14879.73',
		},
		'10383': {
			id: 'gid://shopify/ProductVariant/43677892182234',
			sku: '10383',
			price: '14879.73',
		},
		'10384': {
			id: 'gid://shopify/ProductVariant/43677892215002',
			sku: '10384',
			price: '14879.73',
		},
		'10385': {
			id: 'gid://shopify/ProductVariant/43677892280538',
			sku: '10385',
			price: '5771.53',
		},
		'10386': {
			id: 'gid://shopify/ProductVariant/43677892346074',
			sku: '10386',
			price: '5771.53',
		},
		'10387': {
			id: 'gid://shopify/ProductVariant/43677892411610',
			sku: '10387',
			price: '5771.53',
		},
		'10388': {
			id: 'gid://shopify/ProductVariant/43677892444378',
			sku: '10388',
			price: '5771.53',
		},
		'10389': {
			id: 'gid://shopify/ProductVariant/43677892509914',
			sku: '10389',
			price: '5771.53',
		},
		'10390': {
			id: 'gid://shopify/ProductVariant/43677892542682',
			sku: '10390',
			price: '5771.53',
		},
		'10391': {
			id: 'gid://shopify/ProductVariant/43677892640986',
			sku: '10391',
			price: '7008.29',
		},
		'10392': {
			id: 'gid://shopify/ProductVariant/43677892673754',
			sku: '10392',
			price: '7008.29',
		},
		'10393': {
			id: 'gid://shopify/ProductVariant/43677892739290',
			sku: '10393',
			price: '7008.29',
		},
		'10394': {
			id: 'gid://shopify/ProductVariant/43677892772058',
			sku: '10394',
			price: '7008.29',
		},
		'10395': {
			id: 'gid://shopify/ProductVariant/43677892804826',
			sku: '10395',
			price: '7008.29',
		},
		'10396': {
			id: 'gid://shopify/ProductVariant/43677892903130',
			sku: '10396',
			price: '7008.29',
		},
		'10397': {
			id: 'gid://shopify/ProductVariant/43677892968666',
			sku: '10397',
			price: '58.44',
		},
		'10398': {
			id: 'gid://shopify/ProductVariant/43677893034202',
			sku: '10398',
			price: '58.44',
		},
		'10399': {
			id: 'gid://shopify/ProductVariant/43677893066970',
			sku: '10399',
			price: '58.44',
		},
		'10400': {
			id: 'gid://shopify/ProductVariant/43677893132506',
			sku: '10400',
			price: '58.44',
		},
		'10401': {
			id: 'gid://shopify/ProductVariant/43677893165274',
			sku: '10401',
			price: '58.44',
		},
		'10402': {
			id: 'gid://shopify/ProductVariant/43677893198042',
			sku: '10402',
			price: '58.44',
		},
		'10403': {
			id: 'gid://shopify/ProductVariant/43677893263578',
			sku: '10403',
			price: '90.90',
		},
		'10404': {
			id: 'gid://shopify/ProductVariant/43677893296346',
			sku: '10404',
			price: '90.90',
		},
		'10405': {
			id: 'gid://shopify/ProductVariant/43677893361882',
			sku: '10405',
			price: '90.90',
		},
		'10406': {
			id: 'gid://shopify/ProductVariant/43677893427418',
			sku: '10406',
			price: '90.90',
		},
		'10407': {
			id: 'gid://shopify/ProductVariant/43677893492954',
			sku: '10407',
			price: '90.90',
		},
		'10408': {
			id: 'gid://shopify/ProductVariant/43677893525722',
			sku: '10408',
			price: '90.90',
		},
		'10409': {
			id: 'gid://shopify/ProductVariant/43677893689562',
			sku: '10409',
			price: '187.35',
		},
		'10410': {
			id: 'gid://shopify/ProductVariant/43677893722330',
			sku: '10410',
			price: '187.35',
		},
		'10411': {
			id: 'gid://shopify/ProductVariant/43677893787866',
			sku: '10411',
			price: '187.35',
		},
		'10412': {
			id: 'gid://shopify/ProductVariant/43677893820634',
			sku: '10412',
			price: '187.35',
		},
		'10413': {
			id: 'gid://shopify/ProductVariant/43677893918938',
			sku: '10413',
			price: '187.35',
		},
		'10414': {
			id: 'gid://shopify/ProductVariant/43677893951706',
			sku: '10414',
			price: '187.35',
		},
		'10415': {
			id: 'gid://shopify/ProductVariant/43677893984474',
			sku: '10415',
			price: '198.17',
		},
		'10416': {
			id: 'gid://shopify/ProductVariant/43677894082778',
			sku: '10416',
			price: '198.17',
		},
		'10417': {
			id: 'gid://shopify/ProductVariant/43677894148314',
			sku: '10417',
			price: '198.17',
		},
		'10418': {
			id: 'gid://shopify/ProductVariant/43677894213850',
			sku: '10418',
			price: '198.17',
		},
		'10419': {
			id: 'gid://shopify/ProductVariant/43677894246618',
			sku: '10419',
			price: '198.17',
		},
		'10420': {
			id: 'gid://shopify/ProductVariant/43677894344922',
			sku: '10420',
			price: '198.17',
		},
		'10421': {
			id: 'gid://shopify/ProductVariant/43677894377690',
			sku: '10421',
			price: '393.51',
		},
		'10422': {
			id: 'gid://shopify/ProductVariant/43677894410458',
			sku: '10422',
			price: '393.51',
		},
		'10423': {
			id: 'gid://shopify/ProductVariant/43677894508762',
			sku: '10423',
			price: '393.51',
		},
		'10424': {
			id: 'gid://shopify/ProductVariant/43677894541530',
			sku: '10424',
			price: '393.51',
		},
		'10425': {
			id: 'gid://shopify/ProductVariant/43677894639834',
			sku: '10425',
			price: '393.51',
		},
		'10426': {
			id: 'gid://shopify/ProductVariant/43677894705370',
			sku: '10426',
			price: '393.51',
		},
		'10427': {
			id: 'gid://shopify/ProductVariant/43677894770906',
			sku: '10427',
			price: '418.11',
		},
		'10428': {
			id: 'gid://shopify/ProductVariant/43677894869210',
			sku: '10428',
			price: '418.11',
		},
		'10429': {
			id: 'gid://shopify/ProductVariant/43677894967514',
			sku: '10429',
			price: '418.11',
		},
		'10430': {
			id: 'gid://shopify/ProductVariant/43677895000282',
			sku: '10430',
			price: '418.11',
		},
		'10431': {
			id: 'gid://shopify/ProductVariant/43677895033050',
			sku: '10431',
			price: '418.11',
		},
		'10432': {
			id: 'gid://shopify/ProductVariant/43677895131354',
			sku: '10432',
			price: '418.11',
		},
		'10433': {
			id: 'gid://shopify/ProductVariant/43677895164122',
			sku: '10433',
			price: '37.34',
		},
		'10434': {
			id: 'gid://shopify/ProductVariant/43677895229658',
			sku: '10434',
			price: '37.34',
		},
		'10435': {
			id: 'gid://shopify/ProductVariant/43677895262426',
			sku: '10435',
			price: '37.34',
		},
		'10436': {
			id: 'gid://shopify/ProductVariant/43677895360730',
			sku: '10436',
			price: '37.34',
		},
		'10437': {
			id: 'gid://shopify/ProductVariant/43677895426266',
			sku: '10437',
			price: '37.34',
		},
		'10438': {
			id: 'gid://shopify/ProductVariant/43677895524570',
			sku: '10438',
			price: '37.34',
		},
		'10439': {
			id: 'gid://shopify/ProductVariant/43677895557338',
			sku: '10439',
			price: '187.35',
		},
		'10440': {
			id: 'gid://shopify/ProductVariant/43677895622874',
			sku: '10440',
			price: '187.35',
		},
		'10441': {
			id: 'gid://shopify/ProductVariant/43677895721178',
			sku: '10441',
			price: '187.35',
		},
		'10442': {
			id: 'gid://shopify/ProductVariant/43677895753946',
			sku: '10442',
			price: '187.35',
		},
		'10443': {
			id: 'gid://shopify/ProductVariant/43677895852250',
			sku: '10443',
			price: '39.93',
		},
		'10444': {
			id: 'gid://shopify/ProductVariant/43677895917786',
			sku: '10444',
			price: '39.93',
		},
		'10445': {
			id: 'gid://shopify/ProductVariant/43677895983322',
			sku: '10445',
			price: '39.93',
		},
		'10446': {
			id: 'gid://shopify/ProductVariant/43677896016090',
			sku: '10446',
			price: '39.93',
		},
		'10447': {
			id: 'gid://shopify/ProductVariant/43677896114394',
			sku: '10447',
			price: '14.61',
		},
		'10448': {
			id: 'gid://shopify/ProductVariant/43677896179930',
			sku: '10448',
			price: '14.61',
		},
		'10449': {
			id: 'gid://shopify/ProductVariant/43677896245466',
			sku: '10449',
			price: '14.61',
		},
		'10450': {
			id: 'gid://shopify/ProductVariant/43677896278234',
			sku: '10450',
			price: '14.61',
		},
		'10451': {
			id: 'gid://shopify/ProductVariant/43677896311002',
			sku: '10451',
			price: '67.64',
		},
		'10452': {
			id: 'gid://shopify/ProductVariant/43677896376538',
			sku: '10452',
			price: '67.64',
		},
		'10453': {
			id: 'gid://shopify/ProductVariant/43677896409306',
			sku: '10453',
			price: '67.64',
		},
		'10454': {
			id: 'gid://shopify/ProductVariant/43677896507610',
			sku: '10454',
			price: '67.64',
		},
		'10455': {
			id: 'gid://shopify/ProductVariant/43677896573146',
			sku: '10455',
			price: '55.19',
		},
		'10456': {
			id: 'gid://shopify/ProductVariant/43677896638682',
			sku: '10456',
			price: '55.19',
		},
		'10457': {
			id: 'gid://shopify/ProductVariant/43677896671450',
			sku: '10457',
			price: '55.19',
		},
		'10458': {
			id: 'gid://shopify/ProductVariant/43677896736986',
			sku: '10458',
			price: '55.19',
		},
		'10459': {
			id: 'gid://shopify/ProductVariant/43677897949402',
			sku: '10459',
			price: '62.90',
		},
		'10460': {
			id: 'gid://shopify/ProductVariant/43677899391194',
			sku: '10460',
			price: '62.90',
		},
		'10461': {
			id: 'gid://shopify/ProductVariant/43677901390042',
			sku: '10461',
			price: '62.90',
		},
		'10462': {
			id: 'gid://shopify/ProductVariant/43677902438618',
			sku: '10462',
			price: '50.32',
		},
		'10463': {
			id: 'gid://shopify/ProductVariant/43677903716570',
			sku: '10463',
			price: '50.32',
		},
		'10464': {
			id: 'gid://shopify/ProductVariant/43677904797914',
			sku: '10464',
			price: '50.32',
		},
		'10465': {
			id: 'gid://shopify/ProductVariant/43677907681498',
			sku: '10465',
			price: '48.70',
		},
		'10466': {
			id: 'gid://shopify/ProductVariant/43677908304090',
			sku: '10466',
			price: '48.70',
		},
		'10467': {
			id: 'gid://shopify/ProductVariant/43677909483738',
			sku: '10467',
			price: '48.70',
		},
		'10468': {
			id: 'gid://shopify/ProductVariant/43677909582042',
			sku: '10468',
			price: '51.13',
		},
		'10469': {
			id: 'gid://shopify/ProductVariant/43677911089370',
			sku: '10469',
			price: '51.13',
		},
		'10470': {
			id: 'gid://shopify/ProductVariant/43677911318746',
			sku: '10470',
			price: '51.13',
		},
		'10471': {
			id: 'gid://shopify/ProductVariant/43677911580890',
			sku: '10471',
			price: '54.11',
		},
		'10472': {
			id: 'gid://shopify/ProductVariant/43677911646426',
			sku: '10472',
			price: '54.11',
		},
		'10473': {
			id: 'gid://shopify/ProductVariant/43677911711962',
			sku: '10473',
			price: '54.11',
		},
		'10474': {
			id: 'gid://shopify/ProductVariant/43677911744730',
			sku: '10474',
			price: '150.96',
		},
		'10475': {
			id: 'gid://shopify/ProductVariant/43677911810266',
			sku: '10475',
			price: '150.96',
		},
		'10476': {
			id: 'gid://shopify/ProductVariant/43677911843034',
			sku: '10476',
			price: '150.96',
		},
		'10477': {
			id: 'gid://shopify/ProductVariant/43677911908570',
			sku: '10477',
			price: '114.71',
		},
		'10478': {
			id: 'gid://shopify/ProductVariant/43677911941338',
			sku: '10478',
			price: '114.71',
		},
		'10479': {
			id: 'gid://shopify/ProductVariant/43677912006874',
			sku: '10479',
			price: '114.71',
		},
		'10480': {
			id: 'gid://shopify/ProductVariant/43677912039642',
			sku: '10480',
			price: '81.16',
		},
		'10481': {
			id: 'gid://shopify/ProductVariant/43677912137946',
			sku: '10481',
			price: '81.16',
		},
		'10482': {
			id: 'gid://shopify/ProductVariant/43677912170714',
			sku: '10482',
			price: '81.16',
		},
		'10483': {
			id: 'gid://shopify/ProductVariant/43677912236250',
			sku: '10483',
			price: '82.24',
		},
		'10484': {
			id: 'gid://shopify/ProductVariant/43677912269018',
			sku: '10484',
			price: '82.24',
		},
		'10485': {
			id: 'gid://shopify/ProductVariant/43677912367322',
			sku: '10485',
			price: '82.24',
		},
		'10486': {
			id: 'gid://shopify/ProductVariant/43677912400090',
			sku: '10486',
			price: '14.61',
		},
		'10487': {
			id: 'gid://shopify/ProductVariant/43677912432858',
			sku: '10487',
			price: '14.61',
		},
		'10488': {
			id: 'gid://shopify/ProductVariant/43677912498394',
			sku: '10488',
			price: '14.61',
		},
		'10489': {
			id: 'gid://shopify/ProductVariant/43677912563930',
			sku: '10489',
			price: '187.35',
		},
		'10490': {
			id: 'gid://shopify/ProductVariant/43677912629466',
			sku: '10490',
			price: '187.35',
		},
		'10491': {
			id: 'gid://shopify/ProductVariant/43677912662234',
			sku: '10491',
			price: '187.35',
		},
		'10492': {
			id: 'gid://shopify/ProductVariant/43677912695002',
			sku: '10492',
			price: '0.00',
		},
		'10493': {
			id: 'gid://shopify/ProductVariant/43677912760538',
			sku: '10493',
			price: '0.00',
		},
		'10494': {
			id: 'gid://shopify/ProductVariant/43677912793306',
			sku: '10494',
			price: '0.00',
		},
		'10495': {
			id: 'gid://shopify/ProductVariant/43677912858842',
			sku: '10495',
			price: '48.70',
		},
		'10496': {
			id: 'gid://shopify/ProductVariant/43677912891610',
			sku: '10496',
			price: '48.70',
		},
		'10497': {
			id: 'gid://shopify/ProductVariant/43677912924378',
			sku: '10497',
			price: '48.70',
		},
		'10498': {
			id: 'gid://shopify/ProductVariant/43677913022682',
			sku: '10498',
			price: '157.10',
		},
		'10499': {
			id: 'gid://shopify/ProductVariant/43677913055450',
			sku: '10499',
			price: '157.10',
		},
		'10500': {
			id: 'gid://shopify/ProductVariant/43677913153754',
			sku: '10500',
			price: '157.10',
		},
		'10501': {
			id: 'gid://shopify/ProductVariant/43677913186522',
			sku: '10501',
			price: '157.10',
		},
		'10502': {
			id: 'gid://shopify/ProductVariant/43677913252058',
			sku: '10502',
			price: '157.10',
		},
		'10503': {
			id: 'gid://shopify/ProductVariant/43677913317594',
			sku: '10503',
			price: '157.10',
		},
		'10504': {
			id: 'gid://shopify/ProductVariant/43677913383130',
			sku: '10504',
			price: '157.10',
		},
		'10505': {
			id: 'gid://shopify/ProductVariant/43677913448666',
			sku: '10505',
			price: '157.10',
		},
		'10506': {
			id: 'gid://shopify/ProductVariant/43677913481434',
			sku: '10506',
			price: '157.10',
		},
		'10507': {
			id: 'gid://shopify/ProductVariant/43677913546970',
			sku: '10507',
			price: '72.66',
		},
		'10508': {
			id: 'gid://shopify/ProductVariant/43677913612506',
			sku: '10508',
			price: '72.66',
		},
		'10509': {
			id: 'gid://shopify/ProductVariant/43677913710810',
			sku: '10509',
			price: '72.66',
		},
		'10510': {
			id: 'gid://shopify/ProductVariant/43677913743578',
			sku: '10510',
			price: '72.66',
		},
		'10511': {
			id: 'gid://shopify/ProductVariant/43677913776346',
			sku: '10511',
			price: '72.66',
		},
		'10512': {
			id: 'gid://shopify/ProductVariant/43677913874650',
			sku: '10512',
			price: '51.79',
		},
		'10513': {
			id: 'gid://shopify/ProductVariant/43677913940186',
			sku: '10513',
			price: '51.79',
		},
		'10514': {
			id: 'gid://shopify/ProductVariant/43677914038490',
			sku: '10514',
			price: '51.79',
		},
		'10515': {
			id: 'gid://shopify/ProductVariant/43677914071258',
			sku: '10515',
			price: '51.79',
		},
		'10516': {
			id: 'gid://shopify/ProductVariant/43677914202330',
			sku: '10516',
			price: '51.79',
		},
		'10517': {
			id: 'gid://shopify/ProductVariant/43677914267866',
			sku: '10517',
			price: '66.05',
		},
		'10518': {
			id: 'gid://shopify/ProductVariant/43677914300634',
			sku: '10518',
			price: '66.05',
		},
		'10519': {
			id: 'gid://shopify/ProductVariant/43677914398938',
			sku: '10519',
			price: '66.05',
		},
		'10520': {
			id: 'gid://shopify/ProductVariant/43677914464474',
			sku: '10520',
			price: '66.05',
		},
		'10521': {
			id: 'gid://shopify/ProductVariant/43677914628314',
			sku: '10521',
			price: '66.05',
		},
		'10522': {
			id: 'gid://shopify/ProductVariant/43677914693850',
			sku: '10522',
			price: '46.94',
		},
		'10523': {
			id: 'gid://shopify/ProductVariant/43677914759386',
			sku: '10523',
			price: '46.94',
		},
		'10524': {
			id: 'gid://shopify/ProductVariant/43677914857690',
			sku: '10524',
			price: '46.94',
		},
		'10525': {
			id: 'gid://shopify/ProductVariant/43677914988762',
			sku: '10525',
			price: '46.94',
		},
		'10526': {
			id: 'gid://shopify/ProductVariant/43677915021530',
			sku: '10526',
			price: '46.94',
		},
		'10527': {
			id: 'gid://shopify/ProductVariant/43677915119834',
			sku: '10527',
			price: '117.49',
		},
		'10528': {
			id: 'gid://shopify/ProductVariant/43677915152602',
			sku: '10528',
			price: '117.49',
		},
		'10529': {
			id: 'gid://shopify/ProductVariant/43677915250906',
			sku: '10529',
			price: '117.49',
		},
		'10530': {
			id: 'gid://shopify/ProductVariant/43677915283674',
			sku: '10530',
			price: '117.49',
		},
		'10531': {
			id: 'gid://shopify/ProductVariant/43677915316442',
			sku: '10531',
			price: '117.49',
		},
		'10532': {
			id: 'gid://shopify/ProductVariant/43677915414746',
			sku: '10532',
			price: '89.46',
		},
		'10533': {
			id: 'gid://shopify/ProductVariant/43677915578586',
			sku: '10533',
			price: '89.46',
		},
		'10534': {
			id: 'gid://shopify/ProductVariant/43677915644122',
			sku: '10534',
			price: '89.46',
		},
		'10535': {
			id: 'gid://shopify/ProductVariant/43677915742426',
			sku: '10535',
			price: '89.46',
		},
		'10536': {
			id: 'gid://shopify/ProductVariant/43677915775194',
			sku: '10536',
			price: '89.46',
		},
		'10537': {
			id: 'gid://shopify/ProductVariant/43677915840730',
			sku: '10537',
			price: '34.13',
		},
		'10538': {
			id: 'gid://shopify/ProductVariant/43677915971802',
			sku: '10538',
			price: '34.13',
		},
		'10539': {
			id: 'gid://shopify/ProductVariant/43677916070106',
			sku: '10539',
			price: '34.13',
		},
		'10540': {
			id: 'gid://shopify/ProductVariant/43677916102874',
			sku: '10540',
			price: '34.13',
		},
		'10541': {
			id: 'gid://shopify/ProductVariant/43677916168410',
			sku: '10541',
			price: '34.13',
		},
		'10542': {
			id: 'gid://shopify/ProductVariant/43677916233946',
			sku: '10542',
			price: '58.44',
		},
		'10543': {
			id: 'gid://shopify/ProductVariant/43677916365018',
			sku: '10543',
			price: '58.44',
		},
		'10544': {
			id: 'gid://shopify/ProductVariant/43677916397786',
			sku: '10544',
			price: '58.44',
		},
		'10545': {
			id: 'gid://shopify/ProductVariant/43677916430554',
			sku: '10545',
			price: '58.44',
		},
		'10546': {
			id: 'gid://shopify/ProductVariant/43677916528858',
			sku: '10546',
			price: '58.44',
		},
		'10547': {
			id: 'gid://shopify/ProductVariant/43677916594394',
			sku: '10547',
			price: '90.90',
		},
		'10548': {
			id: 'gid://shopify/ProductVariant/43677916627162',
			sku: '10548',
			price: '90.90',
		},
		'10549': {
			id: 'gid://shopify/ProductVariant/43677916692698',
			sku: '10549',
			price: '90.90',
		},
		'10550': {
			id: 'gid://shopify/ProductVariant/43677916758234',
			sku: '10550',
			price: '90.90',
		},
		'10551': {
			id: 'gid://shopify/ProductVariant/43677916823770',
			sku: '10551',
			price: '90.90',
		},
		'10552': {
			id: 'gid://shopify/ProductVariant/43677916856538',
			sku: '10552',
			price: '292.18',
		},
		'10553': {
			id: 'gid://shopify/ProductVariant/43677916889306',
			sku: '10553',
			price: '324.65',
		},
		'10554': {
			id: 'gid://shopify/ProductVariant/43677916954842',
			sku: '10554',
			price: '292.18',
		},
		'10555': {
			id: 'gid://shopify/ProductVariant/43677917085914',
			sku: '10555',
			price: '292.18',
		},
		'10556': {
			id: 'gid://shopify/ProductVariant/43677917151450',
			sku: '10556',
			price: '292.18',
		},
		'10557': {
			id: 'gid://shopify/ProductVariant/43677917184218',
			sku: '10557',
			price: '292.18',
		},
		'10558': {
			id: 'gid://shopify/ProductVariant/43677917249754',
			sku: '10558',
			price: '324.65',
		},
		'10559': {
			id: 'gid://shopify/ProductVariant/43677917282522',
			sku: '10559',
			price: '324.65',
		},
		'10560': {
			id: 'gid://shopify/ProductVariant/43677917315290',
			sku: '10560',
			price: '324.65',
		},
		'10561': {
			id: 'gid://shopify/ProductVariant/43677917446362',
			sku: '10561',
			price: '324.65',
		},
		'10562': {
			id: 'gid://shopify/ProductVariant/43677917479130',
			sku: '10562',
			price: '162.32',
		},
		'10563': {
			id: 'gid://shopify/ProductVariant/43677917544666',
			sku: '10563',
			price: '162.32',
		},
		'10564': {
			id: 'gid://shopify/ProductVariant/43677917577434',
			sku: '10564',
			price: '162.32',
		},
		'10565': {
			id: 'gid://shopify/ProductVariant/43677917610202',
			sku: '10565',
			price: '162.32',
		},
		'10566': {
			id: 'gid://shopify/ProductVariant/43677917675738',
			sku: '10566',
			price: '162.32',
		},
		'10567': {
			id: 'gid://shopify/ProductVariant/43677917708506',
			sku: '10567',
			price: '198.17',
		},
		'10568': {
			id: 'gid://shopify/ProductVariant/43677917774042',
			sku: '10568',
			price: '198.17',
		},
		'10569': {
			id: 'gid://shopify/ProductVariant/43677917806810',
			sku: '10569',
			price: '198.17',
		},
		'10570': {
			id: 'gid://shopify/ProductVariant/43677917872346',
			sku: '10570',
			price: '198.17',
		},
		'10571': {
			id: 'gid://shopify/ProductVariant/43677917905114',
			sku: '10571',
			price: '198.17',
		},
		'10572': {
			id: 'gid://shopify/ProductVariant/43677917970650',
			sku: '10572',
			price: '41.12',
		},
		'10573': {
			id: 'gid://shopify/ProductVariant/43677918003418',
			sku: '10573',
			price: '41.12',
		},
		'10574': {
			id: 'gid://shopify/ProductVariant/43677918036186',
			sku: '10574',
			price: '41.12',
		},
		'10575': {
			id: 'gid://shopify/ProductVariant/43677918101722',
			sku: '10575',
			price: '41.12',
		},
		'10576': {
			id: 'gid://shopify/ProductVariant/43677918134490',
			sku: '10576',
			price: '41.12',
		},
		'10577': {
			id: 'gid://shopify/ProductVariant/43677918200026',
			sku: '10577',
			price: '77.48',
		},
		'10578': {
			id: 'gid://shopify/ProductVariant/43677918232794',
			sku: '10578',
			price: '77.48',
		},
		'10579': {
			id: 'gid://shopify/ProductVariant/43677918298330',
			sku: '10579',
			price: '77.48',
		},
		'10580': {
			id: 'gid://shopify/ProductVariant/43677918331098',
			sku: '10580',
			price: '77.48',
		},
		'10581': {
			id: 'gid://shopify/ProductVariant/43677918396634',
			sku: '10581',
			price: '77.48',
		},
		'10582': {
			id: 'gid://shopify/ProductVariant/43677918429402',
			sku: '10582',
			price: '59.52',
		},
		'10583': {
			id: 'gid://shopify/ProductVariant/43677918953690',
			sku: '10583',
			price: '59.52',
		},
		'10584': {
			id: 'gid://shopify/ProductVariant/43677920297178',
			sku: '10584',
			price: '59.52',
		},
		'10585': {
			id: 'gid://shopify/ProductVariant/43677920329946',
			sku: '10585',
			price: '59.52',
		},
		'10586': {
			id: 'gid://shopify/ProductVariant/43677920395482',
			sku: '10586',
			price: '59.52',
		},
		'10587': {
			id: 'gid://shopify/ProductVariant/43677920428250',
			sku: '10587',
			price: '80.08',
		},
		'10588': {
			id: 'gid://shopify/ProductVariant/43677920493786',
			sku: '10588',
			price: '80.08',
		},
		'10589': {
			id: 'gid://shopify/ProductVariant/43677920526554',
			sku: '10589',
			price: '80.08',
		},
		'10590': {
			id: 'gid://shopify/ProductVariant/43677920592090',
			sku: '10590',
			price: '80.08',
		},
		'10591': {
			id: 'gid://shopify/ProductVariant/43677920624858',
			sku: '10591',
			price: '80.08',
		},
		'10592': {
			id: 'gid://shopify/ProductVariant/43677920690394',
			sku: '10592',
			price: '81.16',
		},
		'10593': {
			id: 'gid://shopify/ProductVariant/43677920723162',
			sku: '10593',
			price: '81.16',
		},
		'10594': {
			id: 'gid://shopify/ProductVariant/43677920755930',
			sku: '10594',
			price: '81.16',
		},
		'10595': {
			id: 'gid://shopify/ProductVariant/43677920854234',
			sku: '10595',
			price: '81.16',
		},
		'10596': {
			id: 'gid://shopify/ProductVariant/43677920919770',
			sku: '10596',
			price: '81.16',
		},
		'10597': {
			id: 'gid://shopify/ProductVariant/43677920985306',
			sku: '10597',
			price: '107.13',
		},
		'10598': {
			id: 'gid://shopify/ProductVariant/43677921018074',
			sku: '10598',
			price: '107.13',
		},
		'10599': {
			id: 'gid://shopify/ProductVariant/43677921083610',
			sku: '10599',
			price: '107.13',
		},
		'10600': {
			id: 'gid://shopify/ProductVariant/43677921116378',
			sku: '10600',
			price: '107.13',
		},
		'10601': {
			id: 'gid://shopify/ProductVariant/43677921181914',
			sku: '10601',
			price: '107.13',
		},
		'10602': {
			id: 'gid://shopify/ProductVariant/43677921214682',
			sku: '10602',
			price: '73.05',
		},
		'10603': {
			id: 'gid://shopify/ProductVariant/43677921280218',
			sku: '10603',
			price: '73.05',
		},
		'10604': {
			id: 'gid://shopify/ProductVariant/43677921345754',
			sku: '10604',
			price: '73.05',
		},
		'10605': {
			id: 'gid://shopify/ProductVariant/43677921411290',
			sku: '10605',
			price: '73.05',
		},
		'10606': {
			id: 'gid://shopify/ProductVariant/43677921476826',
			sku: '10606',
			price: '73.05',
		},
		'10607': {
			id: 'gid://shopify/ProductVariant/43677921509594',
			sku: '10607',
			price: '113.63',
		},
		'10608': {
			id: 'gid://shopify/ProductVariant/43677921607898',
			sku: '10608',
			price: '113.63',
		},
		'10609': {
			id: 'gid://shopify/ProductVariant/43677921640666',
			sku: '10609',
			price: '113.63',
		},
		'10610': {
			id: 'gid://shopify/ProductVariant/43677921706202',
			sku: '10610',
			price: '113.63',
		},
		'10611': {
			id: 'gid://shopify/ProductVariant/43677921804506',
			sku: '10611',
			price: '113.63',
		},
		'10612': {
			id: 'gid://shopify/ProductVariant/43677921870042',
			sku: '10612',
			price: '105.51',
		},
		'10613': {
			id: 'gid://shopify/ProductVariant/43677921902810',
			sku: '10613',
			price: '105.51',
		},
		'10614': {
			id: 'gid://shopify/ProductVariant/43677922033882',
			sku: '10614',
			price: '105.51',
		},
		'10615': {
			id: 'gid://shopify/ProductVariant/43677922099418',
			sku: '10615',
			price: '105.51',
		},
		'10616': {
			id: 'gid://shopify/ProductVariant/43677922164954',
			sku: '10616',
			price: '105.51',
		},
		'10617': {
			id: 'gid://shopify/ProductVariant/43677922197722',
			sku: '10617',
			price: '292.18',
		},
		'10618': {
			id: 'gid://shopify/ProductVariant/43677922328794',
			sku: '10618',
			price: '292.18',
		},
		'10619': {
			id: 'gid://shopify/ProductVariant/43677922361562',
			sku: '10619',
			price: '292.18',
		},
		'10620': {
			id: 'gid://shopify/ProductVariant/43677922427098',
			sku: '10620',
			price: '292.18',
		},
		'10621': {
			id: 'gid://shopify/ProductVariant/43677922459866',
			sku: '10621',
			price: '292.18',
		},
		'10622': {
			id: 'gid://shopify/ProductVariant/43677922525402',
			sku: '10622',
			price: '324.65',
		},
		'10623': {
			id: 'gid://shopify/ProductVariant/43677922590938',
			sku: '10623',
			price: '324.65',
		},
		'10624': {
			id: 'gid://shopify/ProductVariant/43677922689242',
			sku: '10624',
			price: '324.65',
		},
		'10625': {
			id: 'gid://shopify/ProductVariant/43677922787546',
			sku: '10625',
			price: '324.65',
		},
		'10626': {
			id: 'gid://shopify/ProductVariant/43677922885850',
			sku: '10626',
			price: '324.65',
		},
		'10627': {
			id: 'gid://shopify/ProductVariant/43677922951386',
			sku: '10627',
			price: '284.07',
		},
		'10628': {
			id: 'gid://shopify/ProductVariant/43677923016922',
			sku: '10628',
			price: '284.07',
		},
		'10629': {
			id: 'gid://shopify/ProductVariant/43677923049690',
			sku: '10629',
			price: '284.07',
		},
		'10630': {
			id: 'gid://shopify/ProductVariant/43677923115226',
			sku: '10630',
			price: '284.07',
		},
		'10631': {
			id: 'gid://shopify/ProductVariant/43677923180762',
			sku: '10631',
			price: '284.07',
		},
		'10632': {
			id: 'gid://shopify/ProductVariant/43677923246298',
			sku: '10632',
			price: '114.28',
		},
		'10633': {
			id: 'gid://shopify/ProductVariant/43677923311834',
			sku: '10633',
			price: '114.28',
		},
		'10634': {
			id: 'gid://shopify/ProductVariant/43677923344602',
			sku: '10634',
			price: '114.28',
		},
		'10635': {
			id: 'gid://shopify/ProductVariant/43677923377370',
			sku: '10635',
			price: '48.70',
		},
		'10636': {
			id: 'gid://shopify/ProductVariant/43677923442906',
			sku: '10636',
			price: '48.70',
		},
		'10637': {
			id: 'gid://shopify/ProductVariant/43677923475674',
			sku: '10637',
			price: '48.70',
		},
		'10638': {
			id: 'gid://shopify/ProductVariant/43677923541210',
			sku: '10638',
			price: '48.70',
		},
		'10639': {
			id: 'gid://shopify/ProductVariant/43677923573978',
			sku: '10639',
			price: '137.98',
		},
		'10640': {
			id: 'gid://shopify/ProductVariant/43677923672282',
			sku: '10640',
			price: '137.98',
		},
		'10641': {
			id: 'gid://shopify/ProductVariant/43677923737818',
			sku: '10641',
			price: '137.98',
		},
		'10642': {
			id: 'gid://shopify/ProductVariant/43677923803354',
			sku: '10642',
			price: '137.98',
		},
		'10643': {
			id: 'gid://shopify/ProductVariant/43677923836122',
			sku: '10643',
			price: '137.98',
		},
		'10644': {
			id: 'gid://shopify/ProductVariant/43677923901658',
			sku: '10644',
			price: '47.07',
		},
		'10645': {
			id: 'gid://shopify/ProductVariant/43677923934426',
			sku: '10645',
			price: '47.07',
		},
		'10646': {
			id: 'gid://shopify/ProductVariant/43677924032730',
			sku: '10646',
			price: '47.07',
		},
		'10647': {
			id: 'gid://shopify/ProductVariant/43677924065498',
			sku: '10647',
			price: '47.07',
		},
		'10648': {
			id: 'gid://shopify/ProductVariant/43677924098266',
			sku: '10648',
			price: '47.07',
		},
		'10649': {
			id: 'gid://shopify/ProductVariant/43677924163802',
			sku: '10649',
			price: '73.59',
		},
		'10650': {
			id: 'gid://shopify/ProductVariant/43677924196570',
			sku: '10650',
			price: '73.59',
		},
		'10651': {
			id: 'gid://shopify/ProductVariant/43677924294874',
			sku: '10651',
			price: '73.59',
		},
		'10652': {
			id: 'gid://shopify/ProductVariant/43677924327642',
			sku: '10652',
			price: '73.59',
		},
		'10653': {
			id: 'gid://shopify/ProductVariant/43677924425946',
			sku: '10653',
			price: '73.59',
		},
		'10654': {
			id: 'gid://shopify/ProductVariant/43677924491482',
			sku: '10654',
			price: '55.43',
		},
		'10655': {
			id: 'gid://shopify/ProductVariant/43677924589786',
			sku: '10655',
			price: '55.43',
		},
		'10656': {
			id: 'gid://shopify/ProductVariant/43677924622554',
			sku: '10656',
			price: '55.43',
		},
		'10657': {
			id: 'gid://shopify/ProductVariant/43677924688090',
			sku: '10657',
			price: '55.43',
		},
		'10658': {
			id: 'gid://shopify/ProductVariant/43677924753626',
			sku: '10658',
			price: '55.43',
		},
		'10659': {
			id: 'gid://shopify/ProductVariant/43677924819162',
			sku: '10659',
			price: '55.43',
		},
		'10660': {
			id: 'gid://shopify/ProductVariant/43677924884698',
			sku: '10660',
			price: '187.35',
		},
		'10661': {
			id: 'gid://shopify/ProductVariant/43677924917466',
			sku: '10661',
			price: '187.35',
		},
		'10662': {
			id: 'gid://shopify/ProductVariant/43677924983002',
			sku: '10662',
			price: '187.35',
		},
		'10663': {
			id: 'gid://shopify/ProductVariant/43677925015770',
			sku: '10663',
			price: '187.35',
		},
		'10664': {
			id: 'gid://shopify/ProductVariant/43677925081306',
			sku: '10664',
			price: '187.35',
		},
		'10665': {
			id: 'gid://shopify/ProductVariant/43677925114074',
			sku: '10665',
			price: '198.17',
		},
		'10666': {
			id: 'gid://shopify/ProductVariant/43677925212378',
			sku: '10666',
			price: '198.17',
		},
		'10667': {
			id: 'gid://shopify/ProductVariant/43677925245146',
			sku: '10667',
			price: '198.17',
		},
		'10668': {
			id: 'gid://shopify/ProductVariant/43677925310682',
			sku: '10668',
			price: '198.17',
		},
		'10669': {
			id: 'gid://shopify/ProductVariant/43677925376218',
			sku: '10669',
			price: '198.17',
		},
		'10670': {
			id: 'gid://shopify/ProductVariant/43677925441754',
			sku: '10670',
			price: '48.70',
		},
		'10671': {
			id: 'gid://shopify/ProductVariant/43677925474522',
			sku: '10671',
			price: '48.70',
		},
		'10672': {
			id: 'gid://shopify/ProductVariant/43677925572826',
			sku: '10672',
			price: '48.70',
		},
		'10673': {
			id: 'gid://shopify/ProductVariant/43677925638362',
			sku: '10673',
			price: '48.70',
		},
		'10674': {
			id: 'gid://shopify/ProductVariant/43677925671130',
			sku: '10674',
			price: '48.70',
		},
		'10675': {
			id: 'gid://shopify/ProductVariant/43677925736666',
			sku: '10675',
			price: '63.31',
		},
		'10676': {
			id: 'gid://shopify/ProductVariant/43677925802202',
			sku: '10676',
			price: '63.31',
		},
		'10677': {
			id: 'gid://shopify/ProductVariant/43677925867738',
			sku: '10677',
			price: '63.31',
		},
		'10678': {
			id: 'gid://shopify/ProductVariant/43677925966042',
			sku: '10678',
			price: '63.31',
		},
		'10679': {
			id: 'gid://shopify/ProductVariant/43677925998810',
			sku: '10679',
			price: '63.31',
		},
		'10680': {
			id: 'gid://shopify/ProductVariant/43677926031578',
			sku: '10680',
			price: '48.70',
		},
		'10681': {
			id: 'gid://shopify/ProductVariant/43677926129882',
			sku: '10681',
			price: '48.70',
		},
		'10682': {
			id: 'gid://shopify/ProductVariant/43677926162650',
			sku: '10682',
			price: '48.70',
		},
		'10683': {
			id: 'gid://shopify/ProductVariant/43677926228186',
			sku: '10683',
			price: '48.70',
		},
		'10684': {
			id: 'gid://shopify/ProductVariant/43677926260954',
			sku: '10684',
			price: '48.70',
		},
		'10685': {
			id: 'gid://shopify/ProductVariant/43677926326490',
			sku: '10685',
			price: '68.18',
		},
		'10686': {
			id: 'gid://shopify/ProductVariant/43677926359258',
			sku: '10686',
			price: '68.18',
		},
		'10687': {
			id: 'gid://shopify/ProductVariant/43677926424794',
			sku: '10687',
			price: '68.18',
		},
		'10688': {
			id: 'gid://shopify/ProductVariant/43677926457562',
			sku: '10688',
			price: '68.18',
		},
		'10689': {
			id: 'gid://shopify/ProductVariant/43677926523098',
			sku: '10689',
			price: '68.18',
		},
		'10690': {
			id: 'gid://shopify/ProductVariant/43677926555866',
			sku: '10690',
			price: '81.16',
		},
		'10691': {
			id: 'gid://shopify/ProductVariant/43677926588634',
			sku: '10691',
			price: '81.16',
		},
		'10692': {
			id: 'gid://shopify/ProductVariant/43677926654170',
			sku: '10692',
			price: '81.16',
		},
		'10693': {
			id: 'gid://shopify/ProductVariant/43677926719706',
			sku: '10693',
			price: '81.16',
		},
		'10694': {
			id: 'gid://shopify/ProductVariant/43677926785242',
			sku: '10694',
			price: '81.16',
		},
		'10695': {
			id: 'gid://shopify/ProductVariant/43677926818010',
			sku: '10695',
			price: '107.13',
		},
		'10696': {
			id: 'gid://shopify/ProductVariant/43677926883546',
			sku: '10696',
			price: '107.13',
		},
		'10697': {
			id: 'gid://shopify/ProductVariant/43677926916314',
			sku: '10697',
			price: '107.13',
		},
		'10698': {
			id: 'gid://shopify/ProductVariant/43677926981850',
			sku: '10698',
			price: '107.13',
		},
		'10699': {
			id: 'gid://shopify/ProductVariant/43677927014618',
			sku: '10699',
			price: '107.13',
		},
		'10700': {
			id: 'gid://shopify/ProductVariant/43677927080154',
			sku: '10700',
			price: '65.42',
		},
		'10701': {
			id: 'gid://shopify/ProductVariant/43677927112922',
			sku: '10701',
			price: '65.42',
		},
		'10702': {
			id: 'gid://shopify/ProductVariant/43677927178458',
			sku: '10702',
			price: '65.42',
		},
		'10703': {
			id: 'gid://shopify/ProductVariant/43677927243994',
			sku: '10703',
			price: '65.42',
		},
		'10704': {
			id: 'gid://shopify/ProductVariant/43677927309530',
			sku: '10704',
			price: '65.42',
		},
		'10705': {
			id: 'gid://shopify/ProductVariant/43677927407834',
			sku: '10705',
			price: '89.28',
		},
		'10706': {
			id: 'gid://shopify/ProductVariant/43677927440602',
			sku: '10706',
			price: '89.28',
		},
		'10707': {
			id: 'gid://shopify/ProductVariant/43677927506138',
			sku: '10707',
			price: '89.28',
		},
		'10708': {
			id: 'gid://shopify/ProductVariant/43677927538906',
			sku: '10708',
			price: '89.28',
		},
		'10709': {
			id: 'gid://shopify/ProductVariant/43677927604442',
			sku: '10709',
			price: '89.28',
		},
		'10710': {
			id: 'gid://shopify/ProductVariant/43677927669978',
			sku: '10710',
			price: '156.91',
		},
		'10711': {
			id: 'gid://shopify/ProductVariant/43677927702746',
			sku: '10711',
			price: '156.91',
		},
		'10712': {
			id: 'gid://shopify/ProductVariant/43677927768282',
			sku: '10712',
			price: '156.91',
		},
		'10713': {
			id: 'gid://shopify/ProductVariant/43677927833818',
			sku: '10713',
			price: '156.91',
		},
		'10714': {
			id: 'gid://shopify/ProductVariant/43677927866586',
			sku: '10714',
			price: '156.91',
		},
		'10715': {
			id: 'gid://shopify/ProductVariant/43677927964890',
			sku: '10715',
			price: '167.74',
		},
		'10716': {
			id: 'gid://shopify/ProductVariant/43677927997658',
			sku: '10716',
			price: '167.74',
		},
		'10717': {
			id: 'gid://shopify/ProductVariant/43677928095962',
			sku: '10717',
			price: '167.74',
		},
		'10718': {
			id: 'gid://shopify/ProductVariant/43677928128730',
			sku: '10718',
			price: '167.74',
		},
		'10719': {
			id: 'gid://shopify/ProductVariant/43677928227034',
			sku: '10719',
			price: '167.74',
		},
		'10720': {
			id: 'gid://shopify/ProductVariant/43677928292570',
			sku: '10720',
			price: '36.52',
		},
		'10721': {
			id: 'gid://shopify/ProductVariant/43677928358106',
			sku: '10721',
			price: '36.52',
		},
		'10722': {
			id: 'gid://shopify/ProductVariant/43677928423642',
			sku: '10722',
			price: '36.52',
		},
		'10723': {
			id: 'gid://shopify/ProductVariant/43677928456410',
			sku: '10723',
			price: '36.52',
		},
		'10724': {
			id: 'gid://shopify/ProductVariant/43677928521946',
			sku: '10724',
			price: '162.32',
		},
		'10725': {
			id: 'gid://shopify/ProductVariant/43677928587482',
			sku: '10725',
			price: '162.32',
		},
		'10726': {
			id: 'gid://shopify/ProductVariant/43677928653018',
			sku: '10726',
			price: '162.32',
		},
		'10727': {
			id: 'gid://shopify/ProductVariant/43677928718554',
			sku: '10727',
			price: '162.32',
		},
		'10728': {
			id: 'gid://shopify/ProductVariant/43677928784090',
			sku: '10728',
			price: '162.32',
		},
		'10729': {
			id: 'gid://shopify/ProductVariant/43677928849626',
			sku: '10729',
			price: '162.32',
		},
		'10730': {
			id: 'gid://shopify/ProductVariant/43677928915162',
			sku: '10730',
			price: '59.52',
		},
		'10731': {
			id: 'gid://shopify/ProductVariant/43677928980698',
			sku: '10731',
			price: '59.52',
		},
		'10732': {
			id: 'gid://shopify/ProductVariant/43677929013466',
			sku: '10732',
			price: '59.52',
		},
		'10733': {
			id: 'gid://shopify/ProductVariant/43677929111770',
			sku: '10733',
			price: '59.52',
		},
		'10734': {
			id: 'gid://shopify/ProductVariant/43677929177306',
			sku: '10734',
			price: '59.52',
		},
		'10735': {
			id: 'gid://shopify/ProductVariant/43677929242842',
			sku: '10735',
			price: '59.52',
		},
		'10736': {
			id: 'gid://shopify/ProductVariant/43677929308378',
			sku: '10736',
			price: '65.41',
		},
		'10737': {
			id: 'gid://shopify/ProductVariant/43677929341146',
			sku: '10737',
			price: '65.41',
		},
		'10738': {
			id: 'gid://shopify/ProductVariant/43677929406682',
			sku: '10738',
			price: '65.41',
		},
		'10739': {
			id: 'gid://shopify/ProductVariant/43677929472218',
			sku: '10739',
			price: '65.41',
		},
		'10740': {
			id: 'gid://shopify/ProductVariant/43677929570522',
			sku: '10740',
			price: '65.41',
		},
		'10741': {
			id: 'gid://shopify/ProductVariant/43677929603290',
			sku: '10741',
			price: '65.41',
		},
		'10742': {
			id: 'gid://shopify/ProductVariant/43677929668826',
			sku: '10742',
			price: '72.14',
		},
		'10743': {
			id: 'gid://shopify/ProductVariant/43677929701594',
			sku: '10743',
			price: '72.14',
		},
		'10744': {
			id: 'gid://shopify/ProductVariant/43677929767130',
			sku: '10744',
			price: '72.14',
		},
		'10745': {
			id: 'gid://shopify/ProductVariant/43677929799898',
			sku: '10745',
			price: '72.14',
		},
		'10746': {
			id: 'gid://shopify/ProductVariant/43677929898202',
			sku: '10746',
			price: '72.14',
		},
		'10747': {
			id: 'gid://shopify/ProductVariant/43677929930970',
			sku: '10747',
			price: '72.14',
		},
		'10748': {
			id: 'gid://shopify/ProductVariant/43677930029274',
			sku: '10748',
			price: '18.26',
		},
		'10749': {
			id: 'gid://shopify/ProductVariant/43677930094810',
			sku: '10749',
			price: '18.26',
		},
		'10750': {
			id: 'gid://shopify/ProductVariant/43677930127578',
			sku: '10750',
			price: '18.26',
		},
		'10751': {
			id: 'gid://shopify/ProductVariant/43677930225882',
			sku: '10751',
			price: '18.26',
		},
		'10752': {
			id: 'gid://shopify/ProductVariant/43677930291418',
			sku: '10752',
			price: '18.26',
		},
		'10753': {
			id: 'gid://shopify/ProductVariant/43677930356954',
			sku: '10753',
			price: '18.26',
		},
		'10754': {
			id: 'gid://shopify/ProductVariant/43677930422490',
			sku: '10754',
			price: '67.64',
		},
		'10755': {
			id: 'gid://shopify/ProductVariant/43677930488026',
			sku: '10755',
			price: '67.64',
		},
		'10756': {
			id: 'gid://shopify/ProductVariant/43677930586330',
			sku: '10756',
			price: '67.64',
		},
		'10757': {
			id: 'gid://shopify/ProductVariant/43677930651866',
			sku: '10757',
			price: '67.64',
		},
		'10758': {
			id: 'gid://shopify/ProductVariant/43677930684634',
			sku: '10758',
			price: '67.64',
		},
		'10759': {
			id: 'gid://shopify/ProductVariant/43677930750170',
			sku: '10759',
			price: '67.64',
		},
		'10760': {
			id: 'gid://shopify/ProductVariant/43677930782938',
			sku: '10760',
			price: '55.39',
		},
		'10761': {
			id: 'gid://shopify/ProductVariant/43677930848474',
			sku: '10761',
			price: '55.39',
		},
		'10762': {
			id: 'gid://shopify/ProductVariant/43677930914010',
			sku: '10762',
			price: '55.39',
		},
		'10763': {
			id: 'gid://shopify/ProductVariant/43677930979546',
			sku: '10763',
			price: '55.39',
		},
		'10764': {
			id: 'gid://shopify/ProductVariant/43677931045082',
			sku: '10764',
			price: '55.39',
		},
		'10765': {
			id: 'gid://shopify/ProductVariant/43677931077850',
			sku: '10765',
			price: '55.39',
		},
		'10766': {
			id: 'gid://shopify/ProductVariant/43677931143386',
			sku: '10766',
			price: '114.28',
		},
		'10767': {
			id: 'gid://shopify/ProductVariant/43677931208922',
			sku: '10767',
			price: '114.28',
		},
		'10768': {
			id: 'gid://shopify/ProductVariant/43677931274458',
			sku: '10768',
			price: '114.28',
		},
		'10769': {
			id: 'gid://shopify/ProductVariant/43677931307226',
			sku: '10769',
			price: '54.11',
		},
		'10770': {
			id: 'gid://shopify/ProductVariant/43677931405530',
			sku: '10770',
			price: '54.11',
		},
		'10771': {
			id: 'gid://shopify/ProductVariant/43677931503834',
			sku: '10771',
			price: '54.11',
		},
		'10772': {
			id: 'gid://shopify/ProductVariant/43677931536602',
			sku: '10772',
			price: '114.28',
		},
		'10773': {
			id: 'gid://shopify/ProductVariant/43677931602138',
			sku: '10773',
			price: '114.28',
		},
		'10774': {
			id: 'gid://shopify/ProductVariant/43677931667674',
			sku: '10774',
			price: '114.28',
		},
		'10775': {
			id: 'gid://shopify/ProductVariant/43677931798746',
			sku: '10775',
			price: '36.52',
		},
		'10776': {
			id: 'gid://shopify/ProductVariant/43677931831514',
			sku: '10776',
			price: '36.52',
		},
		'10777': {
			id: 'gid://shopify/ProductVariant/43677931897050',
			sku: '10777',
			price: '36.52',
		},
		'10778': {
			id: 'gid://shopify/ProductVariant/43677931929818',
			sku: '10778',
			price: '41.12',
		},
		'10779': {
			id: 'gid://shopify/ProductVariant/43677932028122',
			sku: '10779',
			price: '41.12',
		},
		'10780': {
			id: 'gid://shopify/ProductVariant/43677932093658',
			sku: '10780',
			price: '41.12',
		},
		'10781': {
			id: 'gid://shopify/ProductVariant/43677932126426',
			sku: '10781',
			price: '41.12',
		},
		'10782': {
			id: 'gid://shopify/ProductVariant/43677932191962',
			sku: '10782',
			price: '162.32',
		},
		'10783': {
			id: 'gid://shopify/ProductVariant/43677932257498',
			sku: '10783',
			price: '162.32',
		},
		'10784': {
			id: 'gid://shopify/ProductVariant/43677932323034',
			sku: '10784',
			price: '162.32',
		},
		'10785': {
			id: 'gid://shopify/ProductVariant/43677932388570',
			sku: '10785',
			price: '162.32',
		},
		'10786': {
			id: 'gid://shopify/ProductVariant/43677932421338',
			sku: '10786',
			price: '41.12',
		},
		'10787': {
			id: 'gid://shopify/ProductVariant/43677932454106',
			sku: '10787',
			price: '41.12',
		},
		'10788': {
			id: 'gid://shopify/ProductVariant/43677932519642',
			sku: '10788',
			price: '41.12',
		},
		'10789': {
			id: 'gid://shopify/ProductVariant/43677932552410',
			sku: '10789',
			price: '41.12',
		},
		'10790': {
			id: 'gid://shopify/ProductVariant/43677932617946',
			sku: '10790',
			price: '18.26',
		},
		'10791': {
			id: 'gid://shopify/ProductVariant/43677932650714',
			sku: '10791',
			price: '18.26',
		},
		'10792': {
			id: 'gid://shopify/ProductVariant/43677932716250',
			sku: '10792',
			price: '18.26',
		},
		'10793': {
			id: 'gid://shopify/ProductVariant/43677932781786',
			sku: '10793',
			price: '18.26',
		},
		'10794': {
			id: 'gid://shopify/ProductVariant/43677932847322',
			sku: '10794',
			price: '35.17',
		},
		'10795': {
			id: 'gid://shopify/ProductVariant/43677932912858',
			sku: '10795',
			price: '35.17',
		},
		'10796': {
			id: 'gid://shopify/ProductVariant/43677932945626',
			sku: '10796',
			price: '35.17',
		},
		'10797': {
			id: 'gid://shopify/ProductVariant/43677933011162',
			sku: '10797',
			price: '35.17',
		},
		'10798': {
			id: 'gid://shopify/ProductVariant/43677933076698',
			sku: '10798',
			price: '35.17',
		},
		'10799': {
			id: 'gid://shopify/ProductVariant/43677933142234',
			sku: '10799',
			price: '187.35',
		},
		'10800': {
			id: 'gid://shopify/ProductVariant/43677933175002',
			sku: '10800',
			price: '187.35',
		},
		'10801': {
			id: 'gid://shopify/ProductVariant/43677933207770',
			sku: '10801',
			price: '187.35',
		},
		'10802': {
			id: 'gid://shopify/ProductVariant/43677933273306',
			sku: '10802',
			price: '187.35',
		},
		'10803': {
			id: 'gid://shopify/ProductVariant/43677933306074',
			sku: '10803',
			price: '187.35',
		},
		'10804': {
			id: 'gid://shopify/ProductVariant/43677933371610',
			sku: '10804',
			price: '39.93',
		},
		'10805': {
			id: 'gid://shopify/ProductVariant/43677933535450',
			sku: '10805',
			price: '39.93',
		},
		'10806': {
			id: 'gid://shopify/ProductVariant/43677933666522',
			sku: '10806',
			price: '39.93',
		},
		'10807': {
			id: 'gid://shopify/ProductVariant/43677933699290',
			sku: '10807',
			price: '39.93',
		},
		'10808': {
			id: 'gid://shopify/ProductVariant/43677933732058',
			sku: '10808',
			price: '39.93',
		},
		'10809': {
			id: 'gid://shopify/ProductVariant/43677933797594',
			sku: '10809',
			price: '14.61',
		},
		'10810': {
			id: 'gid://shopify/ProductVariant/43677933863130',
			sku: '10810',
			price: '14.61',
		},
		'10811': {
			id: 'gid://shopify/ProductVariant/43677933928666',
			sku: '10811',
			price: '14.61',
		},
		'10812': {
			id: 'gid://shopify/ProductVariant/43677934026970',
			sku: '10812',
			price: '14.61',
		},
		'10813': {
			id: 'gid://shopify/ProductVariant/43677934059738',
			sku: '10813',
			price: '14.61',
		},
		'10814': {
			id: 'gid://shopify/ProductVariant/43677934125274',
			sku: '10814',
			price: '48.31',
		},
		'10815': {
			id: 'gid://shopify/ProductVariant/43677934158042',
			sku: '10815',
			price: '48.31',
		},
		'10816': {
			id: 'gid://shopify/ProductVariant/43677934289114',
			sku: '10816',
			price: '48.31',
		},
		'10817': {
			id: 'gid://shopify/ProductVariant/43677934354650',
			sku: '10817',
			price: '48.31',
		},
		'10818': {
			id: 'gid://shopify/ProductVariant/43677934420186',
			sku: '10818',
			price: '48.31',
		},
		'10819': {
			id: 'gid://shopify/ProductVariant/43677934452954',
			sku: '10819',
			price: '37.88',
		},
		'10820': {
			id: 'gid://shopify/ProductVariant/43677934518490',
			sku: '10820',
			price: '37.88',
		},
		'10821': {
			id: 'gid://shopify/ProductVariant/43677934551258',
			sku: '10821',
			price: '37.88',
		},
		'10822': {
			id: 'gid://shopify/ProductVariant/43677934649562',
			sku: '10822',
			price: '37.88',
		},
		'10823': {
			id: 'gid://shopify/ProductVariant/43677934715098',
			sku: '10823',
			price: '37.88',
		},
		'10824': {
			id: 'gid://shopify/ProductVariant/43677934780634',
			sku: '10824',
			price: '187.35',
		},
		'10825': {
			id: 'gid://shopify/ProductVariant/43677934846170',
			sku: '10825',
			price: '187.35',
		},
		'10826': {
			id: 'gid://shopify/ProductVariant/43677934878938',
			sku: '10826',
			price: '187.35',
		},
		'10827': {
			id: 'gid://shopify/ProductVariant/43677934944474',
			sku: '10827',
			price: '187.35',
		},
		'10828': {
			id: 'gid://shopify/ProductVariant/43677935010010',
			sku: '10828',
			price: '187.35',
		},
		'10829': {
			id: 'gid://shopify/ProductVariant/43677935075546',
			sku: '10829',
			price: '46.59',
		},
		'10830': {
			id: 'gid://shopify/ProductVariant/43677935173850',
			sku: '10830',
			price: '46.59',
		},
		'10831': {
			id: 'gid://shopify/ProductVariant/43677935239386',
			sku: '10831',
			price: '46.59',
		},
		'10832': {
			id: 'gid://shopify/ProductVariant/43677935304922',
			sku: '10832',
			price: '46.59',
		},
		'10833': {
			id: 'gid://shopify/ProductVariant/43677935501530',
			sku: '10833',
			price: '46.59',
		},
		'10834': {
			id: 'gid://shopify/ProductVariant/43677935567066',
			sku: '10834',
			price: '70.07',
		},
		'10835': {
			id: 'gid://shopify/ProductVariant/43677935599834',
			sku: '10835',
			price: '70.07',
		},
		'10836': {
			id: 'gid://shopify/ProductVariant/43677935665370',
			sku: '10836',
			price: '70.07',
		},
		'10837': {
			id: 'gid://shopify/ProductVariant/43677935698138',
			sku: '10837',
			price: '70.07',
		},
		'10838': {
			id: 'gid://shopify/ProductVariant/43677935763674',
			sku: '10838',
			price: '70.07',
		},
		'10839': {
			id: 'gid://shopify/ProductVariant/43677935861978',
			sku: '10839',
			price: '14.61',
		},
		'10840': {
			id: 'gid://shopify/ProductVariant/43677935960282',
			sku: '10840',
			price: '14.61',
		},
		'10841': {
			id: 'gid://shopify/ProductVariant/43677936025818',
			sku: '10841',
			price: '14.61',
		},
		'10842': {
			id: 'gid://shopify/ProductVariant/43677936058586',
			sku: '10842',
			price: '14.61',
		},
		'10843': {
			id: 'gid://shopify/ProductVariant/43677936124122',
			sku: '10843',
			price: '14.61',
		},
		'10844': {
			id: 'gid://shopify/ProductVariant/43677936189658',
			sku: '10844',
			price: '67.64',
		},
		'10845': {
			id: 'gid://shopify/ProductVariant/43677936287962',
			sku: '10845',
			price: '67.64',
		},
		'10846': {
			id: 'gid://shopify/ProductVariant/43677936353498',
			sku: '10846',
			price: '67.64',
		},
		'10847': {
			id: 'gid://shopify/ProductVariant/43677936419034',
			sku: '10847',
			price: '67.64',
		},
		'10848': {
			id: 'gid://shopify/ProductVariant/43677936484570',
			sku: '10848',
			price: '67.64',
		},
		'10849': {
			id: 'gid://shopify/ProductVariant/43677936550106',
			sku: '10849',
			price: '70.07',
		},
		'10850': {
			id: 'gid://shopify/ProductVariant/43677936582874',
			sku: '10850',
			price: '70.07',
		},
		'10851': {
			id: 'gid://shopify/ProductVariant/43677936713946',
			sku: '10851',
			price: '70.07',
		},
		'10852': {
			id: 'gid://shopify/ProductVariant/43677936779482',
			sku: '10852',
			price: '70.07',
		},
		'10853': {
			id: 'gid://shopify/ProductVariant/43677936812250',
			sku: '10853',
			price: '70.07',
		},
		'10854': {
			id: 'gid://shopify/ProductVariant/43677936877786',
			sku: '10854',
			price: '455.00',
		},
		'10855': {
			id: 'gid://shopify/ProductVariant/43677936910554',
			sku: '10855',
			price: '455.00',
		},
		'10856': {
			id: 'gid://shopify/ProductVariant/43677936976090',
			sku: '10856',
			price: '147.57',
		},
		'10857': {
			id: 'gid://shopify/ProductVariant/43677937074394',
			sku: '10857',
			price: '147.57',
		},
		'10858': {
			id: 'gid://shopify/ProductVariant/43677937139930',
			sku: '10858',
			price: '147.57',
		},
		'10859': {
			id: 'gid://shopify/ProductVariant/43677937205466',
			sku: '10859',
			price: '147.57',
		},
		'10860': {
			id: 'gid://shopify/ProductVariant/43677937271002',
			sku: '10860',
			price: '455.00',
		},
		'10861': {
			id: 'gid://shopify/ProductVariant/43677937303770',
			sku: '10861',
			price: '455.00',
		},
		'10862': {
			id: 'gid://shopify/ProductVariant/43677937402074',
			sku: '10862',
			price: '62.77',
		},
		'10863': {
			id: 'gid://shopify/ProductVariant/43677937434842',
			sku: '10863',
			price: '62.77',
		},
		'10864': {
			id: 'gid://shopify/ProductVariant/43677937467610',
			sku: '10864',
			price: '62.77',
		},
		'10865': {
			id: 'gid://shopify/ProductVariant/43677937565914',
			sku: '10865',
			price: '62.77',
		},
		'10866': {
			id: 'gid://shopify/ProductVariant/43677937631450',
			sku: '10866',
			price: '455.00',
		},
		'10867': {
			id: 'gid://shopify/ProductVariant/43677937696986',
			sku: '10867',
			price: '455.00',
		},
		'10868': {
			id: 'gid://shopify/ProductVariant/43677937729754',
			sku: '10868',
			price: '62.46',
		},
		'10869': {
			id: 'gid://shopify/ProductVariant/43677937762522',
			sku: '10869',
			price: '62.46',
		},
		'10870': {
			id: 'gid://shopify/ProductVariant/43677937828058',
			sku: '10870',
			price: '62.46',
		},
		'10871': {
			id: 'gid://shopify/ProductVariant/43677937860826',
			sku: '10871',
			price: '62.46',
		},
		'10872': {
			id: 'gid://shopify/ProductVariant/43677937926362',
			sku: '10872',
			price: '81.33',
		},
		'10873': {
			id: 'gid://shopify/ProductVariant/43677937959130',
			sku: '10873',
			price: '81.33',
		},
		'10874': {
			id: 'gid://shopify/ProductVariant/43677937991898',
			sku: '10874',
			price: '81.33',
		},
		'10875': {
			id: 'gid://shopify/ProductVariant/43677938057434',
			sku: '10875',
			price: '81.33',
		},
		'10876': {
			id: 'gid://shopify/ProductVariant/43677938155738',
			sku: '10876',
			price: '65.63',
		},
		'10877': {
			id: 'gid://shopify/ProductVariant/43677938811098',
			sku: '10877',
			price: '65.63',
		},
		'10878': {
			id: 'gid://shopify/ProductVariant/43677938843866',
			sku: '10878',
			price: '65.63',
		},
		'10879': {
			id: 'gid://shopify/ProductVariant/43677938876634',
			sku: '10879',
			price: '65.63',
		},
		'10880': {
			id: 'gid://shopify/ProductVariant/43677938942170',
			sku: '10880',
			price: '80.11',
		},
		'10881': {
			id: 'gid://shopify/ProductVariant/43677938974938',
			sku: '10881',
			price: '80.11',
		},
		'10882': {
			id: 'gid://shopify/ProductVariant/43677939073242',
			sku: '10882',
			price: '80.11',
		},
		'10883': {
			id: 'gid://shopify/ProductVariant/43677939106010',
			sku: '10883',
			price: '80.11',
		},
		'10884': {
			id: 'gid://shopify/ProductVariant/43677939171546',
			sku: '10884',
			price: '66.41',
		},
		'10885': {
			id: 'gid://shopify/ProductVariant/43677939204314',
			sku: '10885',
			price: '66.41',
		},
		'10886': {
			id: 'gid://shopify/ProductVariant/43677939269850',
			sku: '10886',
			price: '66.41',
		},
		'10887': {
			id: 'gid://shopify/ProductVariant/43677939302618',
			sku: '10887',
			price: '66.41',
		},
		'10915': {
			id: 'gid://shopify/ProductVariant/43774301929690',
			sku: '10915',
			price: '170.29',
		},
		'11086': {
			id: 'gid://shopify/ProductVariant/43917676806362',
			sku: '11086',
			price: '36.96',
		},
		'11090': {
			id: 'gid://shopify/ProductVariant/43917693026522',
			sku: '11090',
			price: '41.76',
		},
		'11082': {
			id: 'gid://shopify/ProductVariant/43917694927066',
			sku: '11082',
			price: '159.40',
		},
		'10182': {
			id: 'gid://shopify/ProductVariant/43969920041178',
			sku: '10182',
			price: '41.12',
		},
		'10179': {
			id: 'gid://shopify/ProductVariant/43969924923610',
			sku: '10179',
			price: '162.30',
		},
		'10185': {
			id: 'gid://shopify/ProductVariant/43969926004954',
			sku: '10185',
			price: '130.80',
		},
		'10188': {
			id: 'gid://shopify/ProductVariant/43969930002650',
			sku: '10188',
			price: '162.30',
		},
		'10192': {
			id: 'gid://shopify/ProductVariant/43969933279450',
			sku: '10192',
			price: '41.12',
		},
		'10196': {
			id: 'gid://shopify/ProductVariant/43969939144922',
			sku: '10196',
			price: '163.50',
		},
		'10305': {
			id: 'gid://shopify/ProductVariant/43974570279130',
			sku: '10305',
			price: '46.59',
		},
		'10301': {
			id: 'gid://shopify/ProductVariant/43974588399834',
			sku: '10301',
			price: '187.35',
		},
		'10309': {
			id: 'gid://shopify/ProductVariant/43974594134234',
			sku: '10309',
			price: '58.44',
		},
		'10313': {
			id: 'gid://shopify/ProductVariant/43974601244890',
			sku: '10313',
			price: '135.27',
		},
		'10308': {
			id: 'gid://shopify/ProductVariant/43975783317722',
			sku: '10308',
			price: '46.59',
		},
		'10307': {
			id: 'gid://shopify/ProductVariant/43975784825050',
			sku: '10307',
			price: '46.59',
		},
		'10306': {
			id: 'gid://shopify/ProductVariant/43975790100698',
			sku: '10306',
			price: '46.59',
		},
		'10184': {
			id: 'gid://shopify/ProductVariant/43975881130202',
			sku: '10184',
			price: '41.12',
		},
		'10183': {
			id: 'gid://shopify/ProductVariant/43975891779802',
			sku: '10183',
			price: '41.12',
		},
		'10304': {
			id: 'gid://shopify/ProductVariant/43976003780826',
			sku: '10304',
			price: '187.35',
		},
		'10302': {
			id: 'gid://shopify/ProductVariant/43976004042970',
			sku: '10302',
			price: '187.35',
		},
		'10303': {
			id: 'gid://shopify/ProductVariant/43976004239578',
			sku: '10303',
			price: '187.35',
		},
		'10314': {
			id: 'gid://shopify/ProductVariant/43976023048410',
			sku: '10314',
			price: '135.27',
		},
		'10315': {
			id: 'gid://shopify/ProductVariant/43976023081178',
			sku: '10315',
			price: '135.27',
		},
		'10316': {
			id: 'gid://shopify/ProductVariant/43976023900378',
			sku: '10316',
			price: '135.27',
		},
		'10310': {
			id: 'gid://shopify/ProductVariant/43976034222298',
			sku: '10310',
			price: '58.44',
		},
		'10311': {
			id: 'gid://shopify/ProductVariant/43976036778202',
			sku: '10311',
			price: '58.44',
		},
		'10312': {
			id: 'gid://shopify/ProductVariant/43976038187226',
			sku: '10312',
			price: '58.44',
		},
		'11094': {
			id: 'gid://shopify/ProductVariant/43976080556250',
			sku: '11094',
			price: '37.28',
		},
		'11095': {
			id: 'gid://shopify/ProductVariant/43976083767514',
			sku: '11095',
			price: '37.28',
		},
		'11096': {
			id: 'gid://shopify/ProductVariant/43976085471450',
			sku: '11096',
			price: '37.28',
		},
		'10180': {
			id: 'gid://shopify/ProductVariant/43976901787866',
			sku: '10180',
			price: '162.30',
		},
		'10181': {
			id: 'gid://shopify/ProductVariant/43976903033050',
			sku: '10181',
			price: '162.30',
		},
		'10186': {
			id: 'gid://shopify/ProductVariant/43976928821466',
			sku: '10186',
			price: '130.80',
		},
		'10187': {
			id: 'gid://shopify/ProductVariant/43976928887002',
			sku: '10187',
			price: '130.80',
		},
		'10193': {
			id: 'gid://shopify/ProductVariant/43977043476698',
			sku: '10193',
			price: '41.12',
		},
		'10194': {
			id: 'gid://shopify/ProductVariant/43977049276634',
			sku: '10194',
			price: '41.12',
		},
		'10195': {
			id: 'gid://shopify/ProductVariant/43977051111642',
			sku: '10195',
			price: '41.12',
		},
		'10189': {
			id: 'gid://shopify/ProductVariant/43977165209818',
			sku: '10189',
			price: '162.30',
		},
		'10190': {
			id: 'gid://shopify/ProductVariant/43977166225626',
			sku: '10190',
			price: '162.30',
		},
		'10191': {
			id: 'gid://shopify/ProductVariant/43977167438042',
			sku: '10191',
			price: '162.30',
		},
		'10197': {
			id: 'gid://shopify/ProductVariant/43977188507866',
			sku: '10197',
			price: '163.50',
		},
		'10198': {
			id: 'gid://shopify/ProductVariant/43977188802778',
			sku: '10198',
			price: '163.50',
		},
		'10199': {
			id: 'gid://shopify/ProductVariant/43977188966618',
			sku: '10199',
			price: '163.50',
		},
		'11083': {
			id: 'gid://shopify/ProductVariant/43977224650970',
			sku: '11083',
			price: '159.40',
		},
		'11084': {
			id: 'gid://shopify/ProductVariant/43977230778586',
			sku: '11084',
			price: '159.40',
		},
		'11085': {
			id: 'gid://shopify/ProductVariant/43977231270106',
			sku: '11085',
			price: '159.40',
		},
		'11087': {
			id: 'gid://shopify/ProductVariant/43977236054234',
			sku: '11087',
			price: '36.96',
		},
		'11088': {
			id: 'gid://shopify/ProductVariant/43977236218074',
			sku: '11088',
			price: '36.96',
		},
		'11089': {
			id: 'gid://shopify/ProductVariant/43977239462106',
			sku: '11089',
			price: '36.96',
		},
		'11091': {
			id: 'gid://shopify/ProductVariant/43977239888090',
			sku: '11091',
			price: '41.76',
		},
		'11092': {
			id: 'gid://shopify/ProductVariant/43977239953626',
			sku: '11092',
			price: '41.76',
		},
		'11093': {
			id: 'gid://shopify/ProductVariant/43977240051930',
			sku: '11093',
			price: '41.76',
		},
		'11103': {
			id: 'gid://shopify/ProductVariant/43977254011098',
			sku: '11103',
			price: '222.52',
		},
		'11104': {
			id: 'gid://shopify/ProductVariant/43977254174938',
			sku: '11104',
			price: '222.52',
		},
		'11105': {
			id: 'gid://shopify/ProductVariant/43977256075482',
			sku: '11105',
			price: '378.29',
		},
		'11097': {
			id: 'gid://shopify/ProductVariant/43977261908186',
			sku: '11097',
			price: '42.08',
		},
		'11098': {
			id: 'gid://shopify/ProductVariant/43977266397402',
			sku: '11098',
			price: '42.08',
		},
		'11099': {
			id: 'gid://shopify/ProductVariant/43977268265178',
			sku: '11099',
			price: '42.08',
		},
		'11100': {
			id: 'gid://shopify/ProductVariant/43977292021978',
			sku: '11100',
			price: '111.30',
		},
		'11101': {
			id: 'gid://shopify/ProductVariant/43977296969946',
			sku: '11101',
			price: '111.30',
		},
		'11102': {
			id: 'gid://shopify/ProductVariant/43977299656922',
			sku: '11102',
			price: '111.30',
		},
		'11106': {
			id: 'gid://shopify/ProductVariant/43977305719002',
			sku: '11106',
			price: '182.10',
		},
		'11107': {
			id: 'gid://shopify/ProductVariant/43977306800346',
			sku: '11107',
			price: '182.10',
		},
		'11108': {
			id: 'gid://shopify/ProductVariant/43977308569818',
			sku: '11108',
			price: '182.10',
		},
		'10923': {
			id: 'gid://shopify/ProductVariant/43978941595866',
			sku: '10923',
			price: '170.29',
		},
		'10920': {
			id: 'gid://shopify/ProductVariant/43978947395802',
			sku: '10920',
			price: '170.29',
		},
		'10922': {
			id: 'gid://shopify/ProductVariant/43978992124122',
			sku: '10922',
			price: '170.29',
		},
		'10916': {
			id: 'gid://shopify/ProductVariant/43979006968026',
			sku: '10916',
			price: '170.29',
		},
		'10917': {
			id: 'gid://shopify/ProductVariant/43979019550938',
			sku: '10917',
			price: '170.29',
		},
		'10918': {
			id: 'gid://shopify/ProductVariant/43979032035546',
			sku: '10918',
			price: '170.29',
		},
		'10919': {
			id: 'gid://shopify/ProductVariant/43979052581082',
			sku: '10919',
			price: '170.29',
		},
		'10969': {
			id: 'gid://shopify/ProductVariant/43987363692762',
			sku: '10969',
			price: '81.33',
		},
		'10971': {
			id: 'gid://shopify/ProductVariant/43987366478042',
			sku: '10971',
			price: '81.33',
		},
		'10970': {
			id: 'gid://shopify/ProductVariant/43987372835034',
			sku: '10970',
			price: '81.33',
		},
		'10972': {
			id: 'gid://shopify/ProductVariant/43987374276826',
			sku: '10972',
			price: '81.33',
		},
		'10973': {
			id: 'gid://shopify/ProductVariant/43987382763738',
			sku: '10973',
			price: '81.33',
		},
		'10974': {
			id: 'gid://shopify/ProductVariant/43987397247194',
			sku: '10974',
			price: '81.33',
		},
		'10975': {
			id: 'gid://shopify/ProductVariant/43987419103450',
			sku: '10975',
			price: '81.33',
		},
		'10976': {
			id: 'gid://shopify/ProductVariant/43987419136218',
			sku: '10976',
			price: '81.33',
		},
		'10977': {
			id: 'gid://shopify/ProductVariant/43987419168986',
			sku: '10977',
			price: '81.33',
		},
		'10924': {
			id: 'gid://shopify/ProductVariant/43987453378778',
			sku: '10924',
			price: '47.08',
		},
		'10925': {
			id: 'gid://shopify/ProductVariant/43987453444314',
			sku: '10925',
			price: '47.08',
		},
		'10926': {
			id: 'gid://shopify/ProductVariant/43987454263514',
			sku: '10926',
			price: '47.08',
		},
		'10927': {
			id: 'gid://shopify/ProductVariant/43987454296282',
			sku: '10927',
			price: '47.08',
		},
		'10931': {
			id: 'gid://shopify/ProductVariant/43987454886106',
			sku: '10931',
			price: '47.08',
		},
		'10928': {
			id: 'gid://shopify/ProductVariant/43987456458970',
			sku: '10928',
			price: '47.08',
		},
		'10930': {
			id: 'gid://shopify/ProductVariant/43987457179866',
			sku: '10930',
			price: '47.08',
		},
		'10932': {
			id: 'gid://shopify/ProductVariant/43987459997914',
			sku: '10932',
			price: '47.08',
		},
		'10979': {
			id: 'gid://shopify/ProductVariant/43987797573850',
			sku: '10979',
			price: '84.32',
		},
		'10978': {
			id: 'gid://shopify/ProductVariant/43987802915034',
			sku: '10978',
			price: '84.32',
		},
		'10980': {
			id: 'gid://shopify/ProductVariant/43987804782810',
			sku: '10980',
			price: '84.32',
		},
		'10981': {
			id: 'gid://shopify/ProductVariant/43987805307098',
			sku: '10981',
			price: '84.32',
		},
		'10982': {
			id: 'gid://shopify/ProductVariant/43987805372634',
			sku: '10982',
			price: '84.32',
		},
		'10983': {
			id: 'gid://shopify/ProductVariant/43987805405402',
			sku: '10983',
			price: '84.32',
		},
		'10984': {
			id: 'gid://shopify/ProductVariant/43987805995226',
			sku: '10984',
			price: '84.32',
		},
		'10985': {
			id: 'gid://shopify/ProductVariant/43987806027994',
			sku: '10985',
			price: '84.32',
		},
		'10986': {
			id: 'gid://shopify/ProductVariant/43987806519514',
			sku: '10986',
			price: '84.32',
		},
		'10987': {
			id: 'gid://shopify/ProductVariant/43987816480986',
			sku: '10987',
			price: '84.32',
		},
		'10988': {
			id: 'gid://shopify/ProductVariant/43987823755482',
			sku: '10988',
			price: '84.32',
		},
		'10989': {
			id: 'gid://shopify/ProductVariant/43987831292122',
			sku: '10989',
			price: '84.32',
		},
		'10990': {
			id: 'gid://shopify/ProductVariant/43987834306778',
			sku: '10990',
			price: '84.32',
		},
		'10991': {
			id: 'gid://shopify/ProductVariant/43987845906650',
			sku: '10991',
			price: '84.32',
		},
		'10992': {
			id: 'gid://shopify/ProductVariant/43987848823002',
			sku: '10992',
			price: '84.32',
		},
		'10993': {
			id: 'gid://shopify/ProductVariant/43987851346138',
			sku: '10993',
			price: '84.32',
		},
		'10994': {
			id: 'gid://shopify/ProductVariant/43987852460250',
			sku: '10994',
			price: '84.32',
		},
		'10995': {
			id: 'gid://shopify/ProductVariant/43987855016154',
			sku: '10995',
			price: '84.32',
		},
		'10907': {
			id: 'gid://shopify/ProductVariant/43987890372826',
			sku: '10907',
			price: '170.29',
		},
		'10908': {
			id: 'gid://shopify/ProductVariant/43987890569434',
			sku: '10908',
			price: '170.29',
		},
		'10909': {
			id: 'gid://shopify/ProductVariant/43987890831578',
			sku: '10909',
			price: '170.29',
		},
		'10906': {
			id: 'gid://shopify/ProductVariant/43987892371674',
			sku: '10906',
			price: '170.29',
		},
		'10910': {
			id: 'gid://shopify/ProductVariant/43987892732122',
			sku: '10910',
			price: '170.29',
		},
		'10911': {
			id: 'gid://shopify/ProductVariant/43987893321946',
			sku: '10911',
			price: '170.29',
		},
		'10912': {
			id: 'gid://shopify/ProductVariant/43987893354714',
			sku: '10912',
			price: '170.29',
		},
		'10914': {
			id: 'gid://shopify/ProductVariant/43987893813466',
			sku: '10914',
			price: '170.29',
		},
		'10913': {
			id: 'gid://shopify/ProductVariant/43987893846234',
			sku: '10913',
			price: '170.29',
		},
		'10960': {
			id: 'gid://shopify/ProductVariant/43988000112858',
			sku: '10960',
			price: '49.19',
		},
		'10961': {
			id: 'gid://shopify/ProductVariant/43988002504922',
			sku: '10961',
			price: '49.19',
		},
		'10962': {
			id: 'gid://shopify/ProductVariant/43988011024602',
			sku: '10962',
			price: '49.19',
		},
		'10963': {
			id: 'gid://shopify/ProductVariant/43988012892378',
			sku: '10963',
			price: '49.19',
		},
		'10964': {
			id: 'gid://shopify/ProductVariant/43988015022298',
			sku: '10964',
			price: '49.19',
		},
		'10965': {
			id: 'gid://shopify/ProductVariant/43988016955610',
			sku: '10965',
			price: '49.19',
		},
		'10967': {
			id: 'gid://shopify/ProductVariant/43988020494554',
			sku: '10967',
			price: '49.19',
		},
		'10966': {
			id: 'gid://shopify/ProductVariant/43988022886618',
			sku: '10966',
			price: '49.19',
		},
		'10968': {
			id: 'gid://shopify/ProductVariant/43988023312602',
			sku: '10968',
			price: '49.19',
		},
		'10952': {
			id: 'gid://shopify/ProductVariant/43988043858138',
			sku: '10952',
			price: '46.94',
		},
		'10953': {
			id: 'gid://shopify/ProductVariant/43988048085210',
			sku: '10953',
			price: '46.94',
		},
		'10954': {
			id: 'gid://shopify/ProductVariant/43988054540506',
			sku: '10954',
			price: '46.94',
		},
		'10951': {
			id: 'gid://shopify/ProductVariant/43988704985306',
			sku: '10951',
			price: '46.94',
		},
		'10955': {
			id: 'gid://shopify/ProductVariant/43988710228186',
			sku: '10955',
			price: '46.94',
		},
		'10956': {
			id: 'gid://shopify/ProductVariant/43988717011162',
			sku: '10956',
			price: '46.94',
		},
		'10957': {
			id: 'gid://shopify/ProductVariant/43988721926362',
			sku: '10957',
			price: '46.94',
		},
		'10958': {
			id: 'gid://shopify/ProductVariant/43988728316122',
			sku: '10958',
			price: '46.94',
		},
		'10959': {
			id: 'gid://shopify/ProductVariant/43988730609882',
			sku: '10959',
			price: '46.94',
		},
		'10933': {
			id: 'gid://shopify/ProductVariant/43988843364570',
			sku: '10933',
			price: '49.19',
		},
		'10934': {
			id: 'gid://shopify/ProductVariant/43988864237786',
			sku: '10934',
			price: '49.19',
		},
		'10935': {
			id: 'gid://shopify/ProductVariant/43988882817242',
			sku: '10935',
			price: '49.19',
		},
		'10936': {
			id: 'gid://shopify/ProductVariant/43988897530074',
			sku: '10936',
			price: '49.19',
		},
		'10937': {
			id: 'gid://shopify/ProductVariant/43988930592986',
			sku: '10937',
			price: '49.19',
		},
		'10938': {
			id: 'gid://shopify/ProductVariant/43988947534042',
			sku: '10938',
			price: '49.19',
		},
		'10939': {
			id: 'gid://shopify/ProductVariant/43988963983578',
			sku: '10939',
			price: '49.19',
		},
		'10940': {
			id: 'gid://shopify/ProductVariant/43988965425370',
			sku: '10940',
			price: '49.19',
		},
		'10941': {
			id: 'gid://shopify/ProductVariant/43988969095386',
			sku: '10941',
			price: '49.19',
		},
		'10929': {
			id: 'gid://shopify/ProductVariant/43988993573082',
			sku: '10929',
			price: '47.08',
		},
		'10942': {
			id: 'gid://shopify/ProductVariant/43989229109466',
			sku: '10942',
			price: '48.49',
		},
		'10943': {
			id: 'gid://shopify/ProductVariant/43989254308058',
			sku: '10943',
			price: '48.49',
		},
		'10944': {
			id: 'gid://shopify/ProductVariant/43989255487706',
			sku: '10944',
			price: '48.49',
		},
		'10945': {
			id: 'gid://shopify/ProductVariant/43989265187034',
			sku: '10945',
			price: '48.49',
		},
		'10946': {
			id: 'gid://shopify/ProductVariant/43989267153114',
			sku: '10946',
			price: '48.49',
		},
		'10947': {
			id: 'gid://shopify/ProductVariant/43989272199386',
			sku: '10947',
			price: '48.49',
		},
		'10948': {
			id: 'gid://shopify/ProductVariant/43989274394842',
			sku: '10948',
			price: '48.49',
		},
		'10949': {
			id: 'gid://shopify/ProductVariant/43989275443418',
			sku: '10949',
			price: '48.49',
		},
		'10950': {
			id: 'gid://shopify/ProductVariant/43989279670490',
			sku: '10950',
			price: '48.49',
		},
		'10888': {
			id: 'gid://shopify/ProductVariant/43989360509146',
			sku: '10888',
			price: '51.00',
		},
		'10889': {
			id: 'gid://shopify/ProductVariant/43989366341850',
			sku: '10889',
			price: '51.00',
		},
		'10890': {
			id: 'gid://shopify/ProductVariant/43989370568922',
			sku: '10890',
			price: '51.00',
		},
		'10891': {
			id: 'gid://shopify/ProductVariant/43989372436698',
			sku: '10891',
			price: '51.00',
		},
		'10892': {
			id: 'gid://shopify/ProductVariant/43989378367706',
			sku: '10892',
			price: '51.00',
		},
		'10893': {
			id: 'gid://shopify/ProductVariant/43989384167642',
			sku: '10893',
			price: '51.00',
		},
		'10894': {
			id: 'gid://shopify/ProductVariant/43989387116762',
			sku: '10894',
			price: '51.00',
		},
		'10895': {
			id: 'gid://shopify/ProductVariant/43989388460250',
			sku: '10895',
			price: '51.00',
		},
		'10896': {
			id: 'gid://shopify/ProductVariant/43989392163034',
			sku: '10896',
			price: '51.00',
		},
		'10897': {
			id: 'gid://shopify/ProductVariant/43989446754522',
			sku: '10897',
			price: '53.29',
		},
		'10898': {
			id: 'gid://shopify/ProductVariant/43989448655066',
			sku: '10898',
			price: '53.29',
		},
		'10899': {
			id: 'gid://shopify/ProductVariant/43989452030170',
			sku: '10899',
			price: '53.29',
		},
		'10904': {
			id: 'gid://shopify/ProductVariant/43989456224474',
			sku: '10904',
			price: '53.29',
		},
		'10900': {
			id: 'gid://shopify/ProductVariant/43989462155482',
			sku: '10900',
			price: '53.29',
		},
		'10901': {
			id: 'gid://shopify/ProductVariant/43989467005146',
			sku: '10901',
			price: '53.29',
		},
		'10902': {
			id: 'gid://shopify/ProductVariant/43989469397210',
			sku: '10902',
			price: '53.29',
		},
		'10905': {
			id: 'gid://shopify/ProductVariant/43989773058266',
			sku: '10905',
			price: '53.29',
		},
		'10903': {
			id: 'gid://shopify/ProductVariant/43989788917978',
			sku: '10903',
			price: '53.29',
		},
	};

	let variants = [];
	for (const [key, value] of Object.entries(shopifyProductVariants)) {
		variants.push(
			prisma.retailerProduct.findUnique({
				where: {
					sku: value.sku,
				},
				select: {
					id: true,
					title: true,
					sku: true,
					price: true,
				},
			})
		);
	}

	const mergedData = await prisma
		.$transaction(variants)
		.then((res) => {
			return res.filter((item) => item !== null);
		})
		.then((res) => {
			return res.map((item) => {
				const shopifyProductVariant = shopifyProductVariants[item.sku];
				const newObject = {
					...item,
					oldPrice: shopifyProductVariant.price,
					gid: shopifyProductVariant.id,
				};
				return newObject;
			});
		});

	// Write to file
	const productVariantInputs: any[] = [];
	const filename = `bulk-op-vars-${crypto.randomUUID()}`;
	const filePath = `${__dirname}/tmp/${filename}.jsonl`;

	for (let i = 0; i < mergedData.length; i++) {
		const productVariantInput = {
			input: {
				id: mergedData[i].gid,
				price: mergedData[i].price,
			},
		};

		// Write to file
		productVariantInputs.push(productVariantInput);
		fs.appendFileSync(filePath, JSON.stringify(productVariantInput));
		fs.appendFileSync(filePath, '\n');
	}

	return json({ filename, mergedData });
};
