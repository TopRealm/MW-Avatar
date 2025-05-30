<?php
namespace Avatar;

use OOUI;

class Hooks {

	public static function onGetPreferences(\User $user, &$preferences) {
		$link = new OOUI\ButtonWidget([
			'label' => wfMessage('uploadavatar')->text(),
			'href' => \SpecialPage::getTitleFor("UploadAvatar")->getLinkURL(),
		]);

		global $wgAvatarEnableS3;
		global $wgDefaultAvatar;
		$ImgWhItExists =  OSSdispose::CheckFileExist($user->getId());
		$imgLink = null;

		if ($wgAvatarEnableS3) {
	        if ($ImgWhItExists['code'] !== 1) {
				$imgLink = $ImgWhItExists['code'] !== 2 ? Avatars::getLinkFor($user->getName()) : $wgDefaultAvatar;
			}
			else {
				$imgLink = $wgDefaultAvatar;
				printf("Error: %s", $ImgWhItExists['msg']);
			}
		}
		else {
			$imgLink = Avatars::getLinkFor($user->getName());
		}

		$preferences['editavatar'] = array(
			'type' => 'info',
			'raw' => true,
			'label-message' => 'prefs-editavatar',
			'default' => '<img src="' . $imgLink . '" width="32" style="vertical-align: middle; margin-right: 8px;"></img> ' . $link,
			'section' => 'personal/info',
		);

		return true;
	}
	
	public static function onSidebarBeforeOutput(\Skin $skin, &$sidebar) {
		$user = $skin->getRelevantUser();
		
		if ($user) {
			$sidebar['TOOLBOX'][] = [
				'text' => wfMessage('sidebar-viewavatar')->text(),
				'href' => \SpecialPage::getTitleFor('ViewAvatar')->getLocalURL(array(
					'user' => $user->getName(),
				)),
			];
		}
	}

	public static function onBaseTemplateToolbox(\BaseTemplate &$baseTemplate, array &$toolbox) {
		if (isset($baseTemplate->data['nav_urls']['viewavatar'])
			&& $baseTemplate->data['nav_urls']['viewavatar']) {
			$toolbox['viewavatar'] = $baseTemplate->data['nav_urls']['viewavatar'];
			$toolbox['viewavatar']['id'] = 't-viewavatar';
		}
	}

	public static function onSetup() {
		global $wgAvatarUploadPath, $wgAvatarUploadDirectory;

		if ($wgAvatarUploadPath === false) {
			global $wgUploadPath;
			$wgAvatarUploadPath = $wgUploadPath . '/avatars';
		}

		if ($wgAvatarUploadDirectory === false) {
			global $wgUploadDirectory;
			$wgAvatarUploadDirectory = $wgUploadDirectory . '/avatars';
		}
	}
}
