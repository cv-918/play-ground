#include "framework.h"
#include "ParticleService.h"

_bool ParticleService::Initialize(_uint _pool_size)
{
	pool_size_ = _pool_size;
	particle_pool_.resize(pool_size_);
	return true;
}

_int ParticleService::Update(_double _delta_time)
{
	//// 각 파티클을 업데이트
	//for (auto& p : particle_pool_) {

	//	// 비활성화된 파티클은 업데이트하지 않음
	//	if (!p.is_active_) continue;

	//	const auto dt_f = s_float(_delta_time);
	//	
	//	// 수명 감소
	//	p.life_time_ -= dt_f;
	//	if (p.life_time_ <= 0.f) {
	//		p.is_active_ = false;
	//		continue;
	//	}

	//	// 위치 이동
	//	p.position_.x += p.velocity_.x * dt_f;
	//	p.position_.y += p.velocity_.y * dt_f;
	//}

	//return UPDATE_CONTINUE;

	const _float dt = s_float(_delta_time);

	for (auto it = active_indices_.begin(); it != active_indices_.end(); )
	{
		_uint idx = *it;
		auto& p = particle_pool_[idx];

		// 1. 수명 관리
		p.life_time_ -= dt;
		if (p.life_time_ <= 0.0f)
		{
			p.is_active_ = false;
			free_indices_.push_back(idx); // 빈 자리로 반납
			it = active_indices_.erase(it); // 리스트에서 제거
			continue;
		}

		// 2. 수명 비율 계산 (0.0: 생성 직후 ~ 1.0: 소멸 직전)
		_float ratio = 1.0f - (p.life_time_ / p.max_life_time_);

		// 3. 물리: 공기 저항 (Damping)
		// 속도가 매 프레임 일정 비율로 줄어들어 부드럽게 멈춥니다.
		p.velocity_ *= (1.0f - p.setting_.airResistance * dt);
		p.position_ += p.velocity_ * dt;

		// 4. Easing 적용: 크기 변화
		// MathFunctions에 추가한 LerpWithEase를 사용하여 연출을 제어합니다.
		p.currentScale = _MathFunc::LerpWithEase(
			p.setting_.startScale,
			p.setting_.endScale,
			ratio,
			p.setting_.sizeEase
		);

		// 5. Easing 적용: 색상/알파 변화
		// 색상 보간 로직 (GDI+ Color 타입에 맞게 처리)
		// ... (내부에서 ARGB 각각 LerpWithEase 적용)

		++it;
	}

	return UPDATE_CONTINUE;
}

void ParticleService::Render(_double _delta_time)
{
	//if (nullptr == g_graphics)
	//	return;

	//for (auto& p : particle_pool_) {
	//	if (!p.is_active_)
	//		continue;

	//	// 1. 수명 비율에 따른 알파값 계산 (1.0 -> 0.0)
	//	_float alpha = p.life_time_ / p.max_life_time_;

	//	// 2. ImageAttributes 설정
	//	static Gdiplus::ImageAttributes attr;
	//	Gdiplus::ColorMatrix matrix = {
	//		1.0f, 0.0f, 0.0f, 0.0f, 0.0f,
	//		0.0f, 1.0f, 0.0f, 0.0f, 0.0f,
	//		0.0f, 0.0f, 1.0f, 0.0f, 0.0f,
	//		0.0f, 0.0f, 0.0f, alpha, 0.0f, // Alpha 필드
	//		0.0f, 0.0f, 0.0f, 0.0f, 1.0f
	//	};
	//	attr.SetColorMatrix(&matrix);

	//	// --- 리소스 없을 때 대체 코드 (단색 원 그리기) ---
	//	// Gdiplus::Color(알파, R, G, B) - ARGB 순서 주의!
	//	Gdiplus::SolidBrush brush(Gdiplus::Color((_byte)(255 * alpha), 200, 200, 200));

	//	_float r = 5.f * p.scale_; // 기본 반지름 5px에 스케일 적용
	//	g_graphics->FillEllipse(&brush,
	//		(Gdiplus::REAL)(p.position_.x - r),
	//		(Gdiplus::REAL)(p.position_.y - r),
	//		(Gdiplus::REAL)(r * 2), (Gdiplus::REAL)(r * 2));
	//	// --------------------------------------------

	//	//// 3. 텍스처 그리기 (임시로 먼지 입자 텍스처 사용)
	//	//auto tex = _GraphicSourceMgr.GetTexture(L"../Data/Resources/Textures/Particles/Dust_Particle.png");
	//	//if (tex) {
	//	//	_float w = tex->GetWidth() * p.scale_;
	//	//	_float h = tex->GetHeight() * p.scale_;

	//	//	g_graphics->DrawImage(tex,
	//	//		Gdiplus::RectF((Gdiplus::REAL)p.position_.x - w / 2, (Gdiplus::REAL)p.position_.y - h / 2, (Gdiplus::REAL)w, (Gdiplus::REAL)h),
	//	//		0, 0, (Gdiplus::REAL)tex->GetWidth(), (Gdiplus::REAL)tex->GetHeight(),
	//	//		Gdiplus::UnitPixel, &attr);
	//	//}
	//}

	for (_uint idx : active_indices_)
	{
		auto& p = particle_pool_[idx];

		// 텍스처가 없는 경우: GDI+ 기본 도형으로 최적화 렌더링
		if (p.setting_.textureKey.empty())
		{
			Gdiplus::SolidBrush brush(p.currentColor);
			_float r = p.currentScale * 5.0f; // 기본 반지름 기준
			g_graphics->FillEllipse(&brush,
				p.position_.x - r, p.position_.y - r, r * 2, r * 2);
		}
		else
		{
			// 텍스처가 있는 경우: DrawImage 호출 (이미지 속성 적용)
			// ...
		}
	}
}

void ParticleService::Emit(const _Vector2& _pos, const _Vector2& _vel, _float _life, _float _scale)
{
	for (auto& p : particle_pool_) {
		if (!p.is_active_) {
			p.position_ = _pos;
			p.velocity_ = _vel;
			p.life_time_ = _life;
			p.max_life_time_ = _life;
			p.scale_ = _scale;
			p.is_active_ = true;
			return; // 하나 찾아서 활성화했으면 종료
		}
	}
}
