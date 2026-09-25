package com.insurancecard.service;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insurancecard.common.ApiException;
import com.insurancecard.common.PageResponse;
import com.insurancecard.common.Paging;
import com.insurancecard.domain.InsuranceProduct;
import com.insurancecard.domain.enums.ProductStatus;
import com.insurancecard.dto.ProductDtos.ProductRequest;
import com.insurancecard.dto.ProductDtos.ProductResponse;
import com.insurancecard.repository.ContractRepository;
import com.insurancecard.repository.InsuranceProductRepository;
import com.insurancecard.validation.ValidationRules;

@Service
public class ProductService {

    private final InsuranceProductRepository productRepository;
    private final ContractRepository contractRepository;

    public ProductService(InsuranceProductRepository productRepository, ContractRepository contractRepository) {
        this.productRepository = productRepository;
        this.contractRepository = contractRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listActive() {
        return productRepository.findByStatusOrderByAnnualPremiumAsc(ProductStatus.ACTIVE).stream()
                .map(DtoMapper::product).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(String q, ProductStatus status, Integer page, Integer size) {
        return PageResponse.of(productRepository.search(Paging.keyword(q), status, Paging.of(page, size)),
                DtoMapper::product);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return DtoMapper.product(find(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest r) {
        String code = validate(r);
        if (productRepository.existsByCodeIgnoreCase(code)) {
            throw ApiException.duplicate("code", "Mã sản phẩm đã tồn tại");
        }
        InsuranceProduct p = new InsuranceProduct();
        apply(p, r, code);
        productRepository.save(p);
        return DtoMapper.product(p);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest r) {
        InsuranceProduct p = find(id);
        String code = validate(r);
        if (productRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw ApiException.duplicate("code", "Mã sản phẩm đã tồn tại");
        }
        if (!p.getCode().equals(code) && contractRepository.existsByProductId(id)) {
            throw ApiException.businessField("PRODUCT_IN_USE", "code",
                    "Sản phẩm đã có hợp đồng, không được đổi mã sản phẩm");
        }
        // Hợp đồng đã ký lưu lại phí và mức bồi thường tại thời điểm ký -> sửa giá chỉ áp dụng cho hợp đồng mới.
        apply(p, r, code);
        return DtoMapper.product(p);
    }

    @Transactional
    public void delete(Long id) {
        InsuranceProduct p = find(id);
        if (contractRepository.existsByProductId(id)) {
            throw ApiException.conflict("PRODUCT_IN_USE",
                    "Sản phẩm đã có hợp đồng, không thể xoá. Hãy chuyển sang trạng thái Ngừng kinh doanh.");
        }
        productRepository.delete(p);
    }

    public InsuranceProduct find(Long id) {
        return productRepository.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy sản phẩm bảo hiểm"));
    }

    private static String validate(ProductRequest r) {
        String code = r.code().toUpperCase(Locale.ROOT);
        if (!code.matches(ValidationRules.PRODUCT_CODE)) {
            throw ApiException.validation("code", ValidationRules.PRODUCT_CODE_MSG);
        }
        if (r.minEngineCapacity() > r.maxEngineCapacity()) {
            throw ApiException.validation("maxEngineCapacity", "Dung tích tối đa phải lớn hơn hoặc bằng dung tích tối thiểu");
        }
        if (r.maxCompensation().compareTo(r.annualPremium()) <= 0) {
            throw ApiException.validation("maxCompensation", "Mức bồi thường tối đa phải lớn hơn phí bảo hiểm/năm");
        }
        return code;
    }

    private static void apply(InsuranceProduct p, ProductRequest r, String code) {
        p.setCode(code);
        p.setName(r.name());
        p.setDescription(r.description());
        p.setMinEngineCapacity(r.minEngineCapacity());
        p.setMaxEngineCapacity(r.maxEngineCapacity());
        p.setAnnualPremium(r.annualPremium());
        p.setMaxCompensation(r.maxCompensation());
        p.setStatus(r.status());
    }
}
