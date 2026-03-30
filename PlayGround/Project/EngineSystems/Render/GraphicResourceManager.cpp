#include "framework.h"
#include "GraphicResourceManager.h"

// GDI+ 관련 생성 오류가 발생하는 파일에서만 매크로를 잠시 끕니다.
#ifdef _DEBUG
#undef new
#endif

// 색상 값을 키로 변환 (ARGB 이용)
_uint GetColorKey(_Color _color) { return _color.GetValue(); }

GraphicResourceManager::~GraphicResourceManager()
{
	Release();
}

Gdiplus::SolidBrush* GraphicResourceManager::GetBrush(_Color _color)
{
	const auto key = GetColorKey(_color);
	if (brushes_.find(key) == brushes_.end())
	{
		brushes_[key] = new Gdiplus::SolidBrush(_color);
	}
	return brushes_[key];
}

Gdiplus::SolidBrush* GraphicResourceManager::GetBrush(_Color _color, _byte _alpha)
{
	// 알파값이 적용된 새로운 색상 생성
	_Color alphaColor(_alpha, _color.GetR(), _color.GetG(), _color.GetB());

	// 이미 만들어둔 GetBrush(Color)를 재호출하여 캐싱 이득을 봄
	return GetBrush(alphaColor);
}

Gdiplus::Pen* GraphicResourceManager::GetPen(_Color _color, _float _thickness)
{
	// 키 생성: 색상과 두께를 조합하여 고유한 키 생성 (색상(32bit)을 상위 비트로, 두께(32bit)를 하위 비트로 밀어서 64bit 키 생성)
	const auto thickness_key = s_cast(_ulonglong, _thickness * 100.0f);
	const auto key = (s_cast(_ulonglong, _color.GetValue()) << 32) | thickness_key;
	if (pens_.find(key) == pens_.end())
	{
		pens_[key] = new Gdiplus::Pen(_color, _thickness);
	}
	return pens_[key];
}

Gdiplus::Pen* GraphicResourceManager::GetPen(_Color _color, _byte _alpha, _float _thickness)
{
	// 알파값이 적용된 새로운 색상 생성
	_Color alphaColor(_alpha, _color.GetR(), _color.GetG(), _color.GetB());

	// 이미 만들어둔 GetPen(Color, Thickness)를 재호출하여 캐싱 이득을 봄
	return GetPen(alphaColor, _thickness);
}

Gdiplus::Font* GraphicResourceManager::GetFont(_float _size, _int _style)
{
	// 1. 크기를 소수점 둘째 자리까지 정수화 (예: 12.5f -> 1250)
	// 24비트면 약 16만까지 표현 가능하므로 폰트 사이즈로는 충분합니다.
	const auto size_key = s_cast(_ulonglong, _size * 100.0f);

	// 2. 키 조합: 상위 비트에 스타일, 하위 비트에 사이즈 배치
	// [ Style (8bit) ][ Size*100 (24bit) ]
	const auto key = (s_cast(_ulonglong, _style & 0xFF) << 24) | (size_key & 0xFFFFFF);

	auto it = fonts_.find(key);
	if (it != fonts_.end()) return it->second;

	// 3. 고정된 폰트 패밀리 사용 (예: D2Coding)
	static Gdiplus::FontFamily fixedFamily(L"D2Coding");

	// 신규 생성
	const auto new_font = new Gdiplus::Font(&fixedFamily, _size, _style, Gdiplus::UnitPixel);
	fonts_[key] = new_font;

	return new_font;
}

Gdiplus::Image* GraphicResourceManager::GetTexture(const std::wstring& _path)
{
	auto it = textures_.find(_path);
	if (it != textures_.end())
		return it->second;

	// 경로에 파일이 있는지 확인 후 로드
	auto new_img = Gdiplus::Image::FromFile(_path.c_str());
	if (new_img->GetLastStatus() != Gdiplus::Ok)
	{
		// 로드 실패 시 처리 (DebugLog 등)
		SAFE_DELETE(new_img);
		return nullptr;
	}

	textures_[_path] = new_img;
	return new_img;
}

Gdiplus::TextureBrush* GraphicResourceManager::GetTextureBrush(const std::wstring& _path, Gdiplus::WrapMode _wrap_mode)
{
	// 1. 경로 해시와 WrapMode 조합으로 고유 키 생성
	size_t path_hash = std::hash<std::wstring>{}(_path);
	_ulonglong key = (s_cast(_ulonglong, path_hash) << 8) | (s_cast(_ulonglong, _wrap_mode));

	if (tex_brushes_.find(key) != tex_brushes_.end())
		return tex_brushes_[key];

	const auto img = GetTexture(_path);
	if (!img) return nullptr;

	// 2. WrapMode를 적용하여 브러시 생성
	const auto new_tex_brush = new Gdiplus::TextureBrush(img, _wrap_mode);
	tex_brushes_[key] = new_tex_brush;
	return new_tex_brush;
}

Gdiplus::TextureBrush* GraphicResourceManager::GetTextureBrush(_ulonglong _key)
{
	return tex_brushes_[_key];
}

Gdiplus::StringFormat* GraphicResourceManager::GetStringFormat(_bool _is_center)
{
	if (_is_center)
	{
		if (!format_center_)
		{
			format_center_ = new Gdiplus::StringFormat();
			format_center_->SetAlignment(Gdiplus::StringAlignmentCenter);
			format_center_->SetLineAlignment(Gdiplus::StringAlignmentCenter);
		}
		return format_center_;
	}

	if (!format_left_)
	{
		format_left_ = new Gdiplus::StringFormat();
		format_left_->SetAlignment(Gdiplus::StringAlignmentNear);
		format_left_->SetLineAlignment(Gdiplus::StringAlignmentNear);
	}
	return format_left_;
}

void GraphicResourceManager::Release()
{
	for (auto& pair : brushes_) SAFE_DELETE(pair.second);
	for (auto& pair : pens_) SAFE_DELETE(pair.second);
	for (auto& pair : fonts_) SAFE_DELETE(pair.second);
	for (auto& pair : textures_) SAFE_DELETE(pair.second);
	for (auto& pair : tex_brushes_) SAFE_DELETE(pair.second);
	brushes_.clear();
	pens_.clear();
	fonts_.clear();
	textures_.clear();
	tex_brushes_.clear();

	SAFE_DELETE(format_center_);
	SAFE_DELETE(format_left_);
}