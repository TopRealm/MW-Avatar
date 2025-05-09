<?php
$specialPageAliases = array();

$specialPageAliases['en'] = array(
	'UploadAvatar' => array('UploadAvatar'),
	'ViewAvatar' => array('ViewAvatar'),
);

$specialPageAliases['zh-hans'] = array(
	'UploadAvatar' => array('上传头像'),
	'ViewAvatar' => array('查看头像'),
);

$specialPageAliases['zh-hant'] = array(
	'UploadAvatar' => array('上傳頭像'),
	'ViewAvatar' => array('檢視頭像'),
);

$specialPageAliases['ja'] = array(
	'UploadAvatar' => array('アバターをアップロード'),
	'ViewAvatar' => array('アバターを検査'),
);

// 在AvatarHooks.php中添加
$magicWords = [];

$magicWords['en'] = [
    'Avatar' => [ 0, 'Avatar' ], // 若使用小写名称则需对应
];

$magicWords['zh-hans'] = [
    'Avatar' => [ 0, 'Avatar' ], // 若使用小写名称则需对应
];