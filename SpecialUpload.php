<?php
namespace Avatar;

use MediaWiki\MediaWikiServices;

class SpecialUpload extends \SpecialPage {

	public function __construct() {
		parent::__construct('UploadAvatar');
	}

	public function execute($par) {
		$this->requireLogin('prefsnologintext2');

		$this->setHeaders();
		$this->outputHeader();
		$request = $this->getRequest();

		if ($this->getUser()->getBlock()) {
			throw new \UserBlockedError($this->getUser()->getBlock());
		}

		if (!MediaWikiServices::getInstance()->getPermissionManager()->userHasRight($this->getUser(), 'avatarupload')) {
			throw new \PermissionsError('avatarupload');
		}

		global $wgMaxAvatarResolution;
		$this->getOutput()->addJsConfigVars('wgMaxAvatarResolution', $wgMaxAvatarResolution);
		$this->getOutput()->addModules('ext.avatar.upload');

		if ($request->wasPosted()) {
			if ($this->processUpload()) {
				$this->getOutput()->redirect(\SpecialPage::getTitleFor('Preferences')->getLinkURL());
			}
		} else {
			$this->displayMessage('');
		}
		$this->displayForm();
	}

	private function displayMessage($msg) {
		$this->getOutput()->addHTML(\Html::rawElement('div', array('class' => 'error', 'id' => 'errorMsg'), $msg));
	}

	private function processUpload() {
		$request = $this->getRequest();
		$dataurl = $request->getVal('avatar');
		if (!$dataurl || parse_url($dataurl, PHP_URL_SCHEME) !== 'data') {
			$this->displayMessage($this->msg('avatar-notuploaded'));
			return false;
		}

		$img = Thumbnail::open($dataurl);

		global $wgMaxAvatarResolution;

		switch ($img->type) {
		case IMAGETYPE_GIF:
		case IMAGETYPE_PNG:
		case IMAGETYPE_JPEG:
			break;
		default:
			$this->displayMessage($this->msg('avatar-invalid'));
			return false;
		}

		// Must be square
		if ($img->width !== $img->height) {
			$this->displayMessage($this->msg('avatar-notsquare'));
			return false;
		}

		// Check if image is too small
		if ($img->width < 32 || $img->height < 32) {
			$this->displayMessage($this->msg('avatar-toosmall'));
			return false;
		}

		// Check if image is too big
		if ($img->width > $wgMaxAvatarResolution || $img->height > $wgMaxAvatarResolution) {
			$this->displayMessage($this->msg('avatar-toolarge'));
			return false;
		}

		$user = $this->getUser();
		Avatars::deleteAvatar($user);

		// Avatar directories
		global $wgAvatarUploadDirectory;
		$uploadDir = $wgAvatarUploadDirectory . '/' . $this->getUser()->getId() . '/';
		@mkdir($uploadDir, 0755, true);

		// We do this to convert format to png
		$img->createThumbnail($wgMaxAvatarResolution, $uploadDir . 'original.png');

		// We only create thumbnail with default resolution here. Others are generated on demand
		global $wgDefaultAvatarRes;
		$img->createThumbnail($wgDefaultAvatarRes, $uploadDir . $wgDefaultAvatarRes . '.png');

		$img->cleanup();

		$this->displayMessage($this->msg('avatar-saved'));

		global $wgAvatarLogInRC;

		$logEntry = new \ManualLogEntry('avatar', 'upload');
		$logEntry->setPerformer($this->getUser());
		$logEntry->setTarget($this->getUser()->getUserPage());
		$logId = $logEntry->insert();
		$logEntry->publish($logId, $wgAvatarLogInRC ? 'rcandudp' : 'udp');

		return true;
	}

	public function displayForm() {
		$html = '<p></p>';
		$html .= \Html::hidden('avatar', '');

		// 选择文件按钮 - 添加白色按钮样式
		$html .= \Xml::element('button', array(
			'id' => 'pickfile',
			'class' => 'mw-ui-button mw-ui-button-element mw-ui-quiet'
		), $this->msg('uploadavatar-selectfile'));

		$html .= ' ';

		// 上传头像按钮 - 添加蓝色按钮样式
		$html .= \Xml::submitButton(
			$this->msg('uploadavatar-submit')->text(),
			array('class' => 'mw-ui-button mw-ui-button-element mw-ui-progressive')
		);

		// Wrap with a form
		$html = \Xml::tags('form', array('action' => $this->getPageTitle()->getLinkURL(), 'method' => 'post'), $html);

		$this->getOutput()->addWikiMsg('uploadavatar-notice');
		$this->getOutput()->addHTML($html);
	}

	public function isListed() {
		return false;
	}
}
