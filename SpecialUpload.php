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
		
		// 加载OOUI模块以确保OOUI样式生效
		$this->getOutput()->addModules(['oojs-ui-core', 'oojs-ui-widgets']);
		$this->getOutput()->enableOOUI(); // 启用OOUI支持

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
		
		// 创建表单面板
		$formPanel = new \OOUI\PanelLayout([
			'padded' => true,
			'framed' => false
		]);
		
		// 创建表单布局
		$formLayout = new \OOUI\FormLayout([
			'method' => 'post',
			'action' => $this->getPageTitle()->getLinkURL()
		]);
		
		// 创建字段集
		$fieldset = new \OOUI\FieldsetLayout();
		
		// 创建隐藏字段
		$hiddenField = new \OOUI\HiddenInputWidget([
			'name' => 'avatar'
		]);
		
		// 创建按钮组
		$buttonGroup = new \OOUI\HorizontalLayout();
		
		// 文件选择按钮 (注意：需要保留id="pickfile"以便JavaScript能找到它)
		$pickfileButton = new \OOUI\ButtonWidget([
			'id' => 'pickfile',
			'label' => $this->msg('uploadavatar-selectfile')->text(),
			'framed' => true
		]);
		
		// 提交按钮
		$submitButton = new \OOUI\ButtonInputWidget([
			'type' => 'submit',
			'label' => $this->msg('uploadavatar-submit')->text(),
			'flags' => ['primary', 'progressive']
		]);
		
		// 组装界面
		$buttonGroup->addItems([$pickfileButton, new \OOUI\SpacerWidget(['classes' => ['spacer']]), $submitButton]);
		$fieldset->addItems([$hiddenField, $buttonGroup]);
		$formLayout->addItems([$fieldset]);
		$formPanel->appendContent($formLayout);
		
		$this->getOutput()->addWikiMsg('uploadavatar-notice');
		$this->getOutput()->addHTML($formPanel);
	}

	public function isListed() {
		return false;
	}
}
