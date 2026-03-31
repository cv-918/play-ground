#pragma once

/** 파티클이 생성되는 모양 정의 */
enum class EmitterShape {
    Point,  // 한 점에서 생성
    Circle, // 원 안에서 랜덤하게 생성
    Box     // 사각형 영역 안에서 랜덤하게 생성
};

/** * ParticleSetting: 파티클의 '레시피'
 * 어떤 모양으로 뿜어낼지, 시간에 따라 어떻게 변할지 정의합니다.
 * nlohmann/json으로 로드하여 재사용하기 좋은 구조입니다.
 */
struct ParticleSetting {
    // JSON에서 고유 식별자로 사용 (예: "explosion", "smoke" 등)
	_uint id_ = 0;

    // [발생기 설정]
    EmitterShape shape = EmitterShape::Circle;
    _float shapeRadius = 5.0f;     // Circle일 때 반지름
    _float arcAngle = 360.0f;      // 분사 각도 (360도면 전방향)

    // [초기값 범위] 파티클 생성 시 이 사이값으로 랜덤하게 결정됨
    _float minLife = 0.5f, maxLife = 1.0f;
    _float minSpeed = 100.0f, maxSpeed = 200.0f;
    _float startScale = 1.0f;

    // [시간에 따른 변화 - Over Lifetime]
    _MathFunc::EaseType sizeEase = _MathFunc::EaseType::Linear;
    _float endScale = 0.0f;        // 1.0이면 유지, 0.0이면 소멸 시 사라짐

    _MathFunc::EaseType colorEase = _MathFunc::EaseType::Linear;
    Gdiplus::Color startColor = Gdiplus::Color::White;
    Gdiplus::Color endColor = Gdiplus::Color(0, 255, 255, 255); // 소멸 시 투명(Alpha 0)

    // [물리 효과]
    _float airResistance = 0.5f;   // 공기 저항 (클수록 빨리 멈춤)
    _float gravityScale = 0.0f;    // 중력 영향도 (벨트스크롤 대비)

    // [시각 효과]
    std::wstring textureKey; // 비어있으면 단색 모드
};

// ParticleSetting의 JSON 변환 함수 구현
inline void to_json(nlohmann::json& j, const ParticleSetting& s)
{
    j = nlohmann::json{
        {"id_", s.id_},
        {"shape", static_cast<int>(s.shape)},
        {"shapeRadius", s.shapeRadius},
        {"arcAngle", s.arcAngle},
        {"minLife", s.minLife},
        {"maxLife", s.maxLife},
        {"minSpeed", s.minSpeed},
        {"maxSpeed", s.maxSpeed},
        {"startScale", s.startScale},
        {"sizeEase", static_cast<int>(s.sizeEase)},
        {"endScale", s.endScale},
        {"colorEase", static_cast<int>(s.colorEase)},
        {"startColor", s.startColor.GetValue()},
        {"endColor", s.endColor.GetValue()},
        {"airResistance", s.airResistance},
        {"gravityScale", s.gravityScale},
        {"textureKey", std::string(s.textureKey.begin(), s.textureKey.end())}
    };
}

inline void from_json(const nlohmann::json& j, ParticleSetting& s)
{
    j.at("id_").get_to(s.id_);
    int shapeInt;
    j.at("shape").get_to(shapeInt);
    s.shape = static_cast<EmitterShape>(shapeInt);
    j.at("shapeRadius").get_to(s.shapeRadius);
    j.at("arcAngle").get_to(s.arcAngle);
    j.at("minLife").get_to(s.minLife);
    j.at("maxLife").get_to(s.maxLife);
    j.at("minSpeed").get_to(s.minSpeed);
    j.at("maxSpeed").get_to(s.maxSpeed);
    j.at("startScale").get_to(s.startScale);
    int sizeEaseInt;
    j.at("sizeEase").get_to(sizeEaseInt);
    s.sizeEase = static_cast<_MathFunc::EaseType>(sizeEaseInt);
    j.at("endScale").get_to(s.endScale);
    int colorEaseInt;
    j.at("colorEase").get_to(colorEaseInt);
    s.colorEase = static_cast<_MathFunc::EaseType>(colorEaseInt);
    UINT startColorValue, endColorValue;
    j.at("startColor").get_to(startColorValue);
    j.at("endColor").get_to(endColorValue);
    s.startColor.SetValue(startColorValue);
    s.endColor.SetValue(endColorValue);
    j.at("airResistance").get_to(s.airResistance);
    j.at("gravityScale").get_to(s.gravityScale);
    std::string textureKeyStr;
    j.at("textureKey").get_to(textureKeyStr);
    s.textureKey = std::wstring(textureKeyStr.begin(), textureKeyStr.end());
}

/** * Particle: 개별 파티클의 실시간 상태
 * 기존 구조체에 '설정 정보'와 '실시간 계산값'이 추가되었습니다.
 */
struct Particle
{
    // --- 기존 멤버 (유지 및 확장) ---
    _Vector2 position_;
    _Vector2 velocity_;
    _float   life_time_ = 0.f;
    _float   max_life_time_ = 0.f;
    _bool    is_active_ = false;

    // --- 고도화를 위해 추가된 멤버 ---
    _float   currentScale = 1.f;     // Easing이 적용된 실시간 크기
    Gdiplus::Color currentColor;     // Easing이 적용된 실시간 색상

    /** * 이 파티클이 생성될 때 사용한 세팅 정보입니다.
     * Update 시 이 세팅의 Easing 타입과 Resistance 값을 참조합니다.
     */
    ParticleSetting setting_;
};